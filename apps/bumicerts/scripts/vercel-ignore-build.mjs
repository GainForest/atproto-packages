#!/usr/bin/env node
/**
 * Vercel Ignored Build Step
 *
 * Called by Vercel before every build. Exit codes:
 *   0 → skip the build (CI hasn't passed yet / no change)
 *   1 → proceed with the build
 *
 * The build is skipped unless the "CI - Bumicerts" GitHub Actions workflow
 * has completed successfully for the current commit SHA.
 *
 * Required Vercel environment variable:
 *   GITHUB_TOKEN — a GitHub PAT with `repo:status` / `checks:read` scope
 *
 * Automatically available from Vercel:
 *   VERCEL_GIT_COMMIT_SHA — the full commit SHA being deployed
 */

const REPO = "GainForest/atproto-packages";
const WORKFLOW_NAME = "CI - Bumicerts";

const sha = process.env.VERCEL_GIT_COMMIT_SHA;
const token = process.env.GITHUB_TOKEN;

if (!sha) {
  console.log("⚠️  VERCEL_GIT_COMMIT_SHA not set — proceeding with build.");
  process.exit(1);
}

if (!token) {
  console.log("⚠️  GITHUB_TOKEN not set — proceeding with build.");
  process.exit(1);
}

const url = `https://api.github.com/repos/${REPO}/commits/${sha}/check-runs`;

console.log(`Checking CI status for ${sha.slice(0, 7)} …`);

let data;
try {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "vercel-ignore-build",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    console.log(`GitHub API returned ${res.status} — proceeding with build.`);
    process.exit(1);
  }

  data = await res.json();
} catch (err) {
  console.error("Failed to reach GitHub API:", err);
  process.exit(1);
}

const runs = (data.check_runs ?? []).filter((r) => r.name === WORKFLOW_NAME);

if (runs.length === 0) {
  console.log(`No check run named "${WORKFLOW_NAME}" found — proceeding with build.`);
  process.exit(1);
}

// Use the most recently started run in case there are multiple (e.g. re-runs).
const latest = runs.sort(
  (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
)[0];

console.log(`CI run: status="${latest.status}" conclusion="${latest.conclusion}"`);

if (latest.status === "completed" && latest.conclusion === "success") {
  console.log("✅ CI passed — proceeding with build.");
  process.exit(1);
}

console.log("⏳ CI has not passed yet — skipping build.");
process.exit(0);
