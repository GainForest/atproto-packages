import { z } from "zod";

import { links } from "@/lib/links";

const hyperlabelTierSchema = z.enum([
  "high-quality",
  "standard",
  "draft",
  "likely-test",
  "pending",
]);

const hyperlabelRecentActivitySchema = z.object({
  did: z.string().min(1),
  rkey: z.string().min(1).nullable().optional(),
  uri: z.string().min(1).nullable().optional(),
  tier: hyperlabelTierSchema,
  labeledAt: z.string().nullable(),
});

const hyperlabelRecentResponseSchema = z.object({
  activities: z.array(hyperlabelRecentActivitySchema),
  total: z.number().int().nonnegative(),
});

type HyperlabelTier = z.infer<typeof hyperlabelTierSchema>;
type HyperlabelRecentActivity = z.infer<
  typeof hyperlabelRecentActivitySchema
>;
type HyperlabelRecentResponse = z.infer<typeof hyperlabelRecentResponseSchema>;

type ActivityLabelInfo = {
  labelTier: string | null;
  label: {
    tier: string | null;
    labeler: string | null;
    labeledAt: string | null;
    syncedAt: string | null;
  } | null;
};

class HyperlabelReadError extends Error {
  readonly operation: string;

  constructor(options: { operation: string; message: string; cause?: unknown }) {
    super(options.message);
    this.name = "HyperlabelReadError";
    this.operation = options.operation;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

const LABELER_SOURCE = "local";
const RECENT_TIERS = hyperlabelTierSchema.options;
let recentLabelCache: Promise<Map<string, ActivityLabelInfo>> | null = null;
const tierActivityCache = new Map<
  HyperlabelTier,
  Promise<HyperlabelRecentActivity[]>
>();

async function requestRecentLabelsForTier(
  tier: HyperlabelTier,
): Promise<HyperlabelRecentResponse> {
  try {
    const response = await fetch(
      links.external.hyperlabel.recent({
        limit: 2000,
        offset: 0,
        tier,
      }),
      {
        headers: { accept: "application/json" },
      },
    );

    if (!response.ok) {
      throw new Error(`Hyperlabel responded with ${response.status}`);
    }

    const payload: unknown = await response.json();
    return hyperlabelRecentResponseSchema.parse(payload);
  } catch (cause) {
    throw new HyperlabelReadError({
      operation: "HyperlabelRecent",
      message: "Hyperlabel request failed for recent activities",
      cause,
    });
  }
}

async function loadRecentLabelsForTier(
  tier: HyperlabelTier,
): Promise<HyperlabelRecentActivity[]> {
  const payload = await requestRecentLabelsForTier(tier);
  return payload.activities;
}

export async function fetchHyperlabelActivitiesForTier(tier: string): Promise<
  Array<{
    did: string;
    rkey: string | null;
    uri: string | null;
    tier: string | null;
    labeledAt: string | null;
  }>
> {
  const parsedTier = hyperlabelTierSchema.safeParse(tier);
  if (!parsedTier.success) {
    return [];
  }

  const existing = tierActivityCache.get(parsedTier.data);
  if (existing) {
    const activities = await existing;
    return activities.map((activity) => ({
      did: activity.did,
      rkey: activity.rkey ?? null,
      uri: activity.uri ?? null,
      tier: activity.tier,
      labeledAt: activity.labeledAt,
    }));
  }

  const promise = loadRecentLabelsForTier(parsedTier.data).catch(
    (error: unknown) => {
      tierActivityCache.delete(parsedTier.data);
      throw error;
    },
  );
  tierActivityCache.set(parsedTier.data, promise);
  const activities = await promise;

  return activities.map((activity) => ({
    did: activity.did,
    rkey: activity.rkey ?? null,
    uri: activity.uri ?? null,
    tier: activity.tier,
    labeledAt: activity.labeledAt,
  }));
}

async function loadRecentLabels(): Promise<Map<string, ActivityLabelInfo>> {
  const map = new Map<string, ActivityLabelInfo>();

  const tierPayloads = await Promise.all(
    RECENT_TIERS.map((tier) => loadRecentLabelsForTier(tier)),
  );

  for (const activities of tierPayloads) {
    for (const activity of activities) {
      if (map.has(activity.did)) continue;

      map.set(activity.did, {
        labelTier: activity.tier,
        label: {
          tier: activity.tier,
          labeler: LABELER_SOURCE,
          labeledAt: activity.labeledAt,
          syncedAt: activity.labeledAt,
        },
      });
    }
  }

  return map;
}

export async function fetchHyperlabelForDid(
  did: string,
): Promise<ActivityLabelInfo | null> {
  if (!recentLabelCache) {
    recentLabelCache = loadRecentLabels().catch((error: unknown) => {
      recentLabelCache = null;
      throw error;
    });
  }

  const map = await recentLabelCache;
  return map.get(did) ?? null;
}
