export const BUMICERT_DETAIL_TAB_IDS = [
  "description",
  "site-boundaries",
  "donations",
  "timeline",
] as const;

export type BumicertDetailTab = (typeof BUMICERT_DETAIL_TAB_IDS)[number];

export const BUMICERT_DETAIL_TAB_LABELS: Record<BumicertDetailTab, string> = {
  "description": "Description",
  "site-boundaries": "Site Boundaries",
  "donations": "Donations",
  "timeline": "Timeline",
};
