#!/usr/bin/env bun
/**
 * scripts/sync-subtree.ts
 *
 * Builds, packs, and syncs a workspace app to a standalone git remote via
 * git subtree. Fully dynamic — no package names hardcoded.
 *
 * Usage:
 *   bun run scripts/sync-subtree.ts [options]
 *
 * Options:
 *   --app <path>        Path to the app inside the monorepo (default: apps/bumicerts)
 *   --remote <name>     Git remote name for the standalone repo (default: bumicerts-platform)
 *   --branch <name>     Branch to push to on the remote (default: main)
 *   --no-build          Skip building packages (use existing dist/)
 *   --no-push           Pack and install vendor but do not git subtree push
 *   --force             Force-push to the remote (use once for initial sync when histories diverge)
 *
 * What it does:
 *   1. Reads the app's package.json to discover all workspace:* dependencies
 *   2. Recursively resolves transitive workspace deps → full dep graph
 *   3. Classifies each dep as "buildable" (has dist/) or "source-only" (raw TS, no dist)
 *   4. Topologically sorts buildable packages by their inter-dependencies
 *   5. Builds each buildable package in order
 *   6. Packs each buildable package via a temp dir (source package.json never touched)
 *      — workspace:* refs in the temp copy are replaced with file: paths
 *   7. Copies source-only packages directly into vendor/
 *   8. Patches the app's package.json: workspace:* → file:./vendor/...
 *   9. Removes bun.lock from the app (standalone repo resolves file: refs at install time)
 *  10. Commits vendor/ + package.json in the monorepo
 *  11. git subtree push --prefix=<app> <remote> <branch>
 */

import { existsSync, mkdirSync, cpSync, rmSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, join, relative, dirname } from "path";
import { execSync, spawnSync } from "child_process";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(flag: string, fallback: string): string {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1] !== undefined) return args[idx + 1] as string;
  return fallback;
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

const APP_DIR     = resolve(getArg("--app",    "apps/bumicerts"));
const REMOTE      = getArg("--remote", "bumicerts-platform");
const BRANCH      = getArg("--branch", "main");
const NO_BUILD    = hasFlag("--no-build");
const NO_PUSH     = hasFlag("--no-push");
const FORCE_PUSH  = hasFlag("--force");

const MONOREPO_ROOT = resolve(dirname(new URL(import.meta.url as string).pathname), "..");
const VENDOR_DIR    = join(APP_DIR, "vendor");
const TMP_DIR       = join(MONOREPO_ROOT, ".sync-tmp");

// ── Types ─────────────────────────────────────────────────────────────────────

interface PackageJson {
  name: string;
  version: string;
  private?: boolean;
  scripts?: Record<string, string>;
  files?: string[];
  exports?: Record<string, unknown> | string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

interface WorkspacePackage {
  name: string;
  version: string;
  dir: string;           // absolute path to the package directory
  pkgJson: PackageJson;
  isSourceOnly: boolean; // true = copy folder as-is; false = build + bun pm pack
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`\n▸ ${msg}`);
}

function step(msg: string) {
  console.log(`  ${msg}`);
}

function run(cmd: string, cwd: string = MONOREPO_ROOT) {
  console.log(`  $ ${cmd}`);
  const result = spawnSync(cmd, { cwd, shell: true, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }
}

function readJson(filePath: string): PackageJson {
  return JSON.parse(readFileSync(filePath, "utf-8")) as PackageJson;
}

function writeJson(filePath: string, obj: unknown) {
  writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

/**
 * Derives the tarball filename bun pm pack produces for a given package.
 * Convention: @scope/name@version → scope-name-version.tgz
 */
function tarballName(name: string, version: string): string {
  // @gainforest/atproto-mutations-next → gainforest-atproto-mutations-next
  const normalized = name.startsWith("@")
    ? name.slice(1).replace("/", "-")
    : name;
  return `${normalized}-${version}.tgz`;
}

/**
 * Returns true if the package is "source-only":
 *   - private: true AND
 *   - no build script OR exports point to .ts files (not dist/)
 */
function isSourceOnly(pkgJson: PackageJson): boolean {
  if (!pkgJson.private) return false;

  // If there's a build script that produces dist, it can still be packed
  const hasBuild = !!pkgJson.scripts?.build;
  if (!hasBuild) return true;

  // Check if exports point to .ts files
  const exportsObj = pkgJson.exports;
  if (exportsObj && typeof exportsObj === "object") {
    const values = Object.values(exportsObj as Record<string, unknown>)
      .flatMap((v) => (typeof v === "string" ? [v] : Object.values(v as Record<string, string>)));
    const hasTs = values.some((v) => typeof v === "string" && v.endsWith(".ts"));
    const hasDist = values.some((v) => typeof v === "string" && v.includes("dist/"));
    if (hasTs && !hasDist) return true;
  }

  return false;
}

/**
 * Finds all workspace package directories by scanning workspaces.
 * Builds a map: package name → WorkspacePackage
 */
function discoverWorkspacePackages(): Map<string, WorkspacePackage> {
  const rootPkg = readJson(join(MONOREPO_ROOT, "package.json"));
  const workspaces: string[] = (rootPkg as unknown as { workspaces?: string[] }).workspaces ?? [];
  const map = new Map<string, WorkspacePackage>();

  for (const pattern of workspaces) {
    // Expand glob patterns like "packages/*"
    const base = pattern.replace(/\/\*$/, "");
    const baseDir = join(MONOREPO_ROOT, base);

    if (!existsSync(baseDir)) continue;

    let dirs: string[] = [];

    if (pattern.endsWith("/*")) {
      dirs = readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => join(baseDir, d.name));
    } else {
      // Direct path like "GENERATED"
      dirs = [join(MONOREPO_ROOT, pattern)];
    }

    for (const dir of dirs) {
      const pkgPath = join(dir, "package.json");
      if (!existsSync(pkgPath)) continue;
      const pkgJson = readJson(pkgPath);
      if (!pkgJson.name) continue;

      map.set(pkgJson.name, {
        name: pkgJson.name,
        version: pkgJson.version,
        dir,
        pkgJson,
        isSourceOnly: isSourceOnly(pkgJson),
      });
    }
  }

  return map;
}

/**
 * Recursively collects all workspace:* dependencies of a package,
 * including transitive ones. Returns a set of package names.
 */
function collectWorkspaceDeps(
  pkgJson: PackageJson,
  allWorkspacePkgs: Map<string, WorkspacePackage>,
  visited: Set<string> = new Set()
): Set<string> {
  const allDeps = {
    ...pkgJson.dependencies,
    ...pkgJson.devDependencies,
    ...pkgJson.peerDependencies,
  };

  for (const [depName, depVersion] of Object.entries(allDeps)) {
    if (depVersion !== "workspace:*") continue;
    if (visited.has(depName)) continue;
    if (!allWorkspacePkgs.has(depName)) continue;

    visited.add(depName);

    const dep = allWorkspacePkgs.get(depName)!;
    collectWorkspaceDeps(dep.pkgJson, allWorkspacePkgs, visited);
  }

  return visited;
}

/**
 * Topological sort of packages based on their workspace:* inter-dependencies.
 * Returns packages in build order (dependencies first).
 */
function topoSort(
  packages: WorkspacePackage[]
): WorkspacePackage[] {
  const nameToIdx = new Map(packages.map((p, i) => [p.name, i]));
  const visited = new Set<string>();
  const sorted: WorkspacePackage[] = [];

  function visit(pkg: WorkspacePackage) {
    if (visited.has(pkg.name)) return;
    visited.add(pkg.name);

    const allDeps = {
      ...pkg.pkgJson.dependencies,
      ...pkg.pkgJson.devDependencies,
    };

    for (const [depName, depVersion] of Object.entries(allDeps)) {
      if (depVersion !== "workspace:*") continue;
      if (!nameToIdx.has(depName)) continue;
      const idx2 = nameToIdx.get(depName);
      if (idx2 !== undefined) {
        const dep = packages[idx2];
        if (dep) visit(dep);
      }
    }

    sorted.push(pkg);
  }

  for (const pkg of packages) {
    visit(pkg);
  }

  return sorted;
}

/**
 * Returns the file: reference value for a given workspace package,
 * as it will appear in the app's package.json.
 */
function fileRef(pkg: WorkspacePackage): string {
  if (pkg.isSourceOnly) {
    return `file:./vendor/${pkg.name.replace("@", "").replace("/", "-")}`;
  }
  return `file:./vendor/${tarballName(pkg.name, pkg.version)}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔═══════════════════════════════════════╗");
  console.log("║       sync-subtree — bumicerts        ║");
  console.log("╚═══════════════════════════════════════╝");
  console.log(`  app:    ${relative(MONOREPO_ROOT, APP_DIR)}`);
  console.log(`  remote: ${REMOTE}`);
  console.log(`  branch: ${BRANCH}`);
  console.log(`  push:   ${NO_PUSH ? "no (--no-push)" : "yes"}`);
  console.log(`  build:  ${NO_BUILD ? "no (--no-build)" : "yes"}`);

  // ── Step 1: Discover all workspace packages in the monorepo ─────────────────
  log("Step 1 — Discovering workspace packages");
  const allWorkspacePkgs = discoverWorkspacePackages();
  step(`Found ${allWorkspacePkgs.size} workspace packages`);

  // ── Step 2: Read app's package.json, collect its workspace deps ─────────────
  log("Step 2 — Resolving app workspace dependencies");
  const appPkgPath = join(APP_DIR, "package.json");

  // Always read the canonical package.json from git HEAD to avoid reading a
  // previously-patched version (file: refs from a prior run).
  const appRelativeForRead = relative(MONOREPO_ROOT, appPkgPath);
  const gitShowResult = spawnSync(`git show HEAD:"${appRelativeForRead}"`, {
    cwd: MONOREPO_ROOT,
    shell: true,
    encoding: "utf-8",
  });
  const appPkg: PackageJson =
    gitShowResult.status === 0
      ? (JSON.parse(gitShowResult.stdout) as PackageJson)
      : readJson(appPkgPath); // fallback to disk if not committed yet

  const neededNames = collectWorkspaceDeps(appPkg, allWorkspacePkgs);
  const neededPkgs = [...neededNames]
    .map((name) => allWorkspacePkgs.get(name)!)
    .filter(Boolean);

  step(`App depends on ${neededPkgs.length} workspace packages (including transitive):`);
  for (const p of neededPkgs) {
    step(`  ${p.isSourceOnly ? "[source]" : "[build] "} ${p.name}@${p.version}`);
  }

  const buildable   = neededPkgs.filter((p) => !p.isSourceOnly);
  const sourceOnly  = neededPkgs.filter((p) => p.isSourceOnly);

  // ── Step 3: Topological sort of buildable packages ──────────────────────────
  log("Step 3 — Sorting build order");
  const sortedBuildable = topoSort(buildable);
  step(`Build order: ${sortedBuildable.map((p) => p.name).join(" → ")}`);

  // ── Step 4: Build each package in order ─────────────────────────────────────
  if (!NO_BUILD) {
    log("Step 4 — Building packages");
    for (const pkg of sortedBuildable) {
      step(`Building ${pkg.name}...`);
      run("bun run build", pkg.dir);
    }
  } else {
    log("Step 4 — Skipping build (--no-build)");
  }

  // ── Step 5: Prepare vendor directory ────────────────────────────────────────
  log("Step 5 — Preparing vendor directory");
  if (existsSync(VENDOR_DIR)) {
    rmSync(VENDOR_DIR, { recursive: true, force: true });
  }
  mkdirSync(VENDOR_DIR, { recursive: true });

  // Cleanup old tmp dir if it exists
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TMP_DIR, { recursive: true });

  // ── Step 6: Pack buildable packages via temp dirs ───────────────────────────
  log("Step 6 — Packing buildable packages");

  // Build the workspace:* → file: replacement map for use inside temp package.jsons
  const fileRefMap: Record<string, string> = {};
  for (const pkg of neededPkgs) {
    fileRefMap[pkg.name] = fileRef(pkg);
  }

  for (const pkg of sortedBuildable) {
    step(`Packing ${pkg.name}...`);

    const tmpPkgDir = join(TMP_DIR, pkg.name.replace("@", "").replace("/", "-"));
    cpSync(pkg.dir, tmpPkgDir, { recursive: true });

    // Patch workspace:* refs in temp copy's package.json
    const tmpPkgJsonPath = join(tmpPkgDir, "package.json");
    const tmpPkgJson = readJson(tmpPkgJsonPath) as unknown as Record<string, unknown>;

    for (const depField of ["dependencies", "devDependencies", "peerDependencies"] as const) {
      const deps = tmpPkgJson[depField] as Record<string, string> | undefined;
      if (!deps) continue;
      for (const [depName, depVersion] of Object.entries(deps)) {
        if (depVersion === "workspace:*" && fileRefMap[depName]) {
          deps[depName] = fileRefMap[depName];
        }
      }
    }

    // Also remove "private" flag so bun pm pack doesn't complain
    delete tmpPkgJson.private;

    writeJson(tmpPkgJsonPath, tmpPkgJson);

    // Pack from temp dir into vendor/
    run(`bun pm pack --destination "${VENDOR_DIR}"`, tmpPkgDir);

    rmSync(tmpPkgDir, { recursive: true, force: true });
  }

  // ── Step 7: Copy source-only packages ───────────────────────────────────────
  log("Step 7 — Copying source-only packages");

  for (const pkg of sourceOnly) {
    const folderName = pkg.name.replace("@", "").replace("/", "-");
    const dest = join(VENDOR_DIR, folderName);
    step(`Copying ${pkg.name} → vendor/${folderName}`);
    cpSync(pkg.dir, dest, { recursive: true });
  }

  // ── Step 8: Patch app's package.json ────────────────────────────────────────
  log("Step 8 — Patching app package.json");

  const patchedAppPkg = JSON.parse(JSON.stringify(appPkg)) as Record<string, unknown>;
  const patchedDeps = patchedAppPkg["dependencies"] as Record<string, string>;

  for (const depField of ["dependencies", "devDependencies"] as const) {
    const deps = patchedAppPkg[depField] as Record<string, string> | undefined;
    if (!deps) continue;
    for (const [depName, depVersion] of Object.entries(deps)) {
      if (depVersion === "workspace:*" && fileRefMap[depName]) {
        step(`  ${depName}: workspace:* → ${fileRefMap[depName]}`);
        deps[depName] = fileRefMap[depName];
      }
    }
  }

  // Also inject ALL transitive workspace deps into app's dependencies so bun
  // can resolve them when installing from packed tarballs (which reference
  // file: paths that need to exist in the app's node_modules).
  for (const pkg of neededPkgs) {
    const isAlreadyDirect =
      (appPkg.dependencies?.[pkg.name] !== undefined) ||
      (appPkg.devDependencies?.[pkg.name] !== undefined);
    if (!isAlreadyDirect) {
      const ref = fileRefMap[pkg.name];
      if (ref) {
        step(`  ${pkg.name}: (transitive) injected → ${ref}`);
        patchedDeps[pkg.name] = ref;
      }
    }
  }

  writeJson(appPkgPath, patchedAppPkg);

  // ── Step 9: Remove bun.lock from app ────────────────────────────────────────
  // No lockfile in the standalone app repo — bun resolves file: refs directly
  // at install time. Keeping a monorepo-generated bun.lock would embed
  // workspace:* entries that are meaningless outside the monorepo.
  log("Step 9 — Removing bun.lock from app");
  const appBunLock = join(APP_DIR, "bun.lock");
  if (existsSync(appBunLock)) {
    rmSync(appBunLock);
    step("Removed bun.lock");
  } else {
    step("No bun.lock present — skipping");
  }

  // ── Step 10: Commit ──────────────────────────────────────────────────────────
  log("Step 10 — Committing vendor + package.json");

  const appRelative = relative(MONOREPO_ROOT, APP_DIR);
  // vendor/ is gitignored in the monorepo (apps/*/vendor/) — use -f to force-add
  // it for this sync commit only. The subtree push carries it to the app repo
  // where it will be committed normally (no such gitignore rule there).
  run(`git add -f "${appRelative}/vendor" "${appRelative}/package.json"`);
  run(`git rm --cached "${appRelative}/bun.lock" 2>/dev/null || true`);
  // --no-verify skips the pre-commit hook (lint/typecheck) for this sync commit.
  // The vendor/ directory contains generated code that may not pass the app's
  // lint rules — it is not app code and should not be linted.
  run(`git commit --no-verify -m "chore(${appRelative}): sync vendor packages for standalone deployment"`);

  // ── Step 11: git subtree push ────────────────────────────────────────────────
  if (!NO_PUSH) {
    log(`Step 11 — Pushing subtree to ${REMOTE}/${BRANCH}`);
    // git subtree push doesn't have a --force flag directly;
    // for force we use the split+push approach
    if (FORCE_PUSH) {
      step("Force push: splitting subtree then force-pushing");
      const splitResult = spawnSync(
        `git subtree split --prefix="${appRelative}" -b sync-subtree-tmp`,
        { cwd: MONOREPO_ROOT, shell: true, stdio: "pipe" }
      );
      if (splitResult.status !== 0) {
        throw new Error("git subtree split failed");
      }
      run(`git push ${REMOTE} sync-subtree-tmp:${BRANCH} --force`);
      run(`git branch -D sync-subtree-tmp`);
    } else {
      run(`git subtree push --prefix="${appRelative}" ${REMOTE} ${BRANCH}`);
    }
    step(`✓ Pushed to ${REMOTE}/${BRANCH}`);

    // ── Reset the sync commit from the monorepo branch ────────────────────────
    // The sync commit (vendor/ + patched package.json) should not live in the
    // monorepo's history — it only existed so git subtree could carry the files.
    // After a successful push, reset HEAD to the pre-sync commit.
    log("Step 12 — Resetting sync commit from monorepo branch");
    run("git reset --hard HEAD~1");
    run(`git checkout "${appRelative}/package.json"`);
    step("Monorepo branch restored to pre-sync state");
  } else {
    log("Step 11 — Skipping push (--no-push)");
    step("Note: sync commit remains on current branch — run with push to auto-reset");
  }

  // ── Cleanup tmp ──────────────────────────────────────────────────────────────
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  // Also clean up the local vendor/ dir (it belongs in the app repo, not here)
  if (existsSync(VENDOR_DIR)) {
    rmSync(VENDOR_DIR, { recursive: true, force: true });
    step("Cleaned up local vendor/ directory");
  }

  console.log("\n✓ Done.\n");
}

main().catch((err) => {
  console.error("\n✗ sync-subtree failed:", err instanceof Error ? err.message : err);
  console.error("\nTo restore the monorepo to a clean state, run:");
  console.error("  git reset --hard HEAD~1  # if a sync commit was made");
  console.error(`  git checkout apps/bumicerts/package.json`);
  console.error(`  rm -rf apps/bumicerts/vendor`);
  // Cleanup tmp dir on failure
  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  process.exit(1);
});
