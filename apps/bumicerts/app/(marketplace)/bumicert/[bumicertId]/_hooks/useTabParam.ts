"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
  BUMICERT_DETAIL_TAB_IDS,
  BUMICERT_DETAIL_TAB_LABELS,
  type BumicertDetailTab,
} from "@/lib/bumicert-tabs";

export const TAB_IDS = BUMICERT_DETAIL_TAB_IDS;
export const TAB_LABELS = BUMICERT_DETAIL_TAB_LABELS;
export type TabId = BumicertDetailTab;

const tabParser = parseAsStringLiteral(TAB_IDS).withDefault("overview");

/**
 * Client hook — reads and writes the `?tab=` query param.
 * Defaults to "overview" when the param is absent or invalid.
 */
export function useTabParam() {
  return useQueryState("tab", tabParser.withOptions({ shallow: true }));
}
