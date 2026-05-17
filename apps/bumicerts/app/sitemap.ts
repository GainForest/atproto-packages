import type { MetadataRoute } from "next";
import { listOrganizationData } from "@/lib/account/server";
import { links } from "@/lib/links";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { requirePublicUrl } from "@/lib/url";

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;

type StaticSitemapEntry = {
  pathname: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

export const dynamic = "force-dynamic";

const STATIC_PUBLIC_ENTRIES = [
  {
    pathname: links.root,
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    pathname: links.explore,
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    pathname: links.allOrganizations,
    changeFrequency: "daily",
    priority: 0.85,
  },
  {
    pathname: links.dashboard,
    changeFrequency: "daily",
    priority: 0.7,
  },
  {
    pathname: links.leaderboard,
    changeFrequency: "daily",
    priority: 0.7,
  },
] satisfies StaticSitemapEntry[];

function buildPublicUrl(baseUrl: string, pathname: string): string {
  return `${baseUrl}${pathname === links.root ? "" : pathname}`;
}

async function getOrganizationSitemapEntries(
  baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const organizations = await listOrganizationData({
      limit: 1000,
      labelTier: "high-quality",
    });

    return organizations
      .filter((organization) => organization.visibility === "Public")
      .flatMap((organization): MetadataRoute.Sitemap => [
        {
          url: buildPublicUrl(baseUrl, links.account.byDid(organization.did)),
          lastModified: organization.createdAt,
          changeFrequency: "weekly",
          priority: 0.8,
        },
        {
          url: buildPublicUrl(baseUrl, links.account.bumicerts(organization.did)),
          lastModified: organization.createdAt,
          changeFrequency: "weekly",
          priority: 0.75,
        },
      ]);
  } catch (error) {
    console.warn("[sitemap] Failed to build organization entries", error);
    return [];
  }
}

async function getBumicertSitemapEntries(
  baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const indexer = await getIndexerCaller();
    const response = await indexer.activities.list({
      limit: 1000,
      hasOrganizationInfoRecord: true,
      labelTier: "high-quality",
    });
    const activities = "data" in response ? response.data : [];

    return activities.flatMap((activity): MetadataRoute.Sitemap => {
      const did = activity.metadata?.did;
      const rkey = activity.metadata?.rkey;
      if (!did || !rkey) {
        return [];
      }

      const lastModified = activity.metadata?.createdAt ?? undefined;

      return [
        {
          url: buildPublicUrl(baseUrl, links.bumicert.view(did, rkey)),
          lastModified,
          changeFrequency: "weekly",
          priority: 0.85,
        },
      ];
    });
  } catch (error) {
    console.warn("[sitemap] Failed to build Bumicert entries", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = requirePublicUrl();
  const [organizationEntries, bumicertEntries] = await Promise.all([
    getOrganizationSitemapEntries(baseUrl),
    getBumicertSitemapEntries(baseUrl),
  ]);

  const generatedAt = new Date();

  return [
    ...STATIC_PUBLIC_ENTRIES.map((entry) => ({
      url: buildPublicUrl(baseUrl, entry.pathname),
      lastModified: generatedAt,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    })),
    ...organizationEntries,
    ...bumicertEntries,
  ];
}
