"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

export const TAB_IDS = [
  "overview",
  "site-boundaries",
  "donations",
  "timeline",
] as const;

export type TabId = (typeof TAB_IDS)[number];

export const TAB_LABELS: Record<TabId, string> = {
  "overview": "Overview",
  "site-boundaries": "Site Boundaries",
  "donations": "Donations",
  "timeline": "Timeline",
};

const tabParser = parseAsStringLiteral(TAB_IDS).withDefault("overview");

/**
 * Client hook — reads and writes the `?tab=` query param.
 * Defaults to "overview" when the param is absent or invalid.
 */
export function useTabParam() {
  return useQueryState("tab", tabParser.withOptions({ shallow: true }));
}
