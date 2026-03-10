#!/usr/bin/env bun
/**
 * Syncs TAP_COLLECTION_FILTERS in .env with the indexed collections.
 *
 * Run this before `docker:up` to ensure Tap has the correct filters.
 *
 * Usage: bun run scripts/sync-collection-filters.ts
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getCollectionFiltersString } from "../src/tap/collection-filters.ts";

const ENV_FILE = join(import.meta.dir, "../.env");
const ENV_KEY = "TAP_COLLECTION_FILTERS";

function syncCollectionFilters(): void {
  const filters = getCollectionFiltersString();
  console.log(`Derived collection filters: ${filters}`);

  if (!existsSync(ENV_FILE)) {
    console.error(`Error: .env file not found at ${ENV_FILE}`);
    console.error("Please copy .env.example to .env first.");
    process.exit(1);
  }

  let envContent = readFileSync(ENV_FILE, "utf-8");

  // Check if TAP_COLLECTION_FILTERS exists in .env
  const regex = new RegExp(`^${ENV_KEY}=.*$`, "m");

  if (regex.test(envContent)) {
    // Update existing value
    const oldValue = envContent.match(regex)?.[0];
    envContent = envContent.replace(regex, `${ENV_KEY}=${filters}`);
    if (oldValue === `${ENV_KEY}=${filters}`) {
      console.log(`${ENV_KEY} is already up to date.`);
    } else {
      console.log(`Updated ${ENV_KEY} in .env`);
    }
  } else {
    // Add new value (append to end)
    envContent =
      envContent.trimEnd() +
      `\n\n# Auto-generated from INDEXED_COLLECTIONS (do not edit manually)\n${ENV_KEY}=${filters}\n`;
    console.log(`Added ${ENV_KEY} to .env`);
  }

  writeFileSync(ENV_FILE, envContent);
  console.log("Done!");
}

syncCollectionFilters();
