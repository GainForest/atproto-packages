import "server-only";

import { z } from "zod";

import { AccountLabelerReadError } from "./errors";

const ORGANIZATION_LABELER_BASE_URL = "https://orglabeler.hypercerts.dev";
const ORGANIZATION_LABELER_RECENT_PAGE_SIZE = 100;
const ORGANIZATION_LABELER_MAX_PAGES = 100;

const organizationLabelTierSchema = z.enum([
  "likely-test",
  "standard",
  "high-quality",
]);

export type OrganizationLabelTier = z.infer<typeof organizationLabelTierSchema>;

const organizationLabelerRecentActivitySchema = z.object({
  did: z.string().min(1),
  tier: organizationLabelTierSchema,
});

const organizationLabelerRecentResponseSchema = z.object({
  activities: z.array(organizationLabelerRecentActivitySchema),
  total: z.number().int().nonnegative(),
});

type OrganizationLabelerRecentResponse = z.infer<
  typeof organizationLabelerRecentResponseSchema
>;

function buildRecentUrl(options: {
  tier: OrganizationLabelTier;
  limit: number;
  offset: number;
}): URL {
  const url = new URL("/api/recent", ORGANIZATION_LABELER_BASE_URL);
  url.searchParams.set("limit", String(options.limit));
  url.searchParams.set("offset", String(options.offset));
  url.searchParams.set("tier", options.tier);
  return url;
}

async function requestRecentOrganizations(options: {
  tier: OrganizationLabelTier;
  limit: number;
  offset: number;
}): Promise<OrganizationLabelerRecentResponse> {
  const url = buildRecentUrl(options);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Organization labeler responded with ${response.status}`);
    }

    const payload: unknown = await response.json();
    return organizationLabelerRecentResponseSchema.parse(payload);
  } catch (cause) {
    throw new AccountLabelerReadError({
      operation: "OrganizationLabelerRecent",
      message: "Organization labeler request failed for recent records",
      cause,
    });
  }
}

function collectLabeledOrganizationDids(options: {
  activities: OrganizationLabelerRecentResponse["activities"];
  tier: OrganizationLabelTier;
}): string[] {
  const seen = new Set<string>();
  const dids: string[] = [];

  for (const activity of options.activities) {
    if (activity.tier !== options.tier || seen.has(activity.did)) continue;
    seen.add(activity.did);
    dids.push(activity.did);
  }

  return dids;
}

export async function listOrganizationDidsByLabelTier(options: {
  tier: OrganizationLabelTier;
  limit: number;
}): Promise<string[]> {
  const maxCount = Math.floor(options.limit);

  if (!Number.isFinite(maxCount) || maxCount <= 0) {
    return [];
  }

  const seen = new Set<string>();
  const dids: string[] = [];
  let offset = 0;

  for (
    let pageIndex = 0;
    pageIndex < ORGANIZATION_LABELER_MAX_PAGES;
    pageIndex += 1
  ) {
    const pageLimit = Math.min(
      ORGANIZATION_LABELER_RECENT_PAGE_SIZE,
      maxCount - dids.length,
    );

    if (pageLimit <= 0) {
      return dids;
    }

    const page = await requestRecentOrganizations({
      tier: options.tier,
      limit: pageLimit,
      offset,
    });

    const pageDids = collectLabeledOrganizationDids({
      activities: page.activities,
      tier: options.tier,
    });

    for (const did of pageDids) {
      if (seen.has(did)) continue;
      seen.add(did);
      dids.push(did);

      if (dids.length >= maxCount) {
        return dids;
      }
    }

    offset += page.activities.length;

    if (page.activities.length === 0 || offset >= page.total) {
      return dids;
    }
  }

  throw new AccountLabelerReadError({
    operation: "OrganizationLabelerRecent",
    message: `Organization labeler exceeded ${ORGANIZATION_LABELER_MAX_PAGES} pages while listing ${options.tier} organizations`,
  });
}
