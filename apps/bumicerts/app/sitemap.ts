import type { MetadataRoute } from "next";
import { listOrganizationData } from "@/lib/account/server";
import { SUPPORTED_LOCALES, type SupportedLanguageCode } from "@/lib/i18n/languages";
import { getLocalizedPathnames, withLocalePrefix } from "@/lib/i18n/routing";
import { links } from "@/lib/links";
import { getIndexerCaller } from "@/lib/trpc/indexer/server";
import { requirePublicUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

type SitemapEntry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<SitemapEntry["changeFrequency"]>;

type StaticSitemapEntry = {
  pathname: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

const STATIC_PUBLIC_ENTRIES = [
  { pathname: links.root, changeFrequency: "weekly", priority: 1 },
  { pathname: links.explore, changeFrequency: "daily", priority: 0.9 },
  { pathname: links.allOrganizations, changeFrequency: "daily", priority: 0.85 },
  { pathname: links.dashboard, changeFrequency: "daily", priority: 0.7 },
  { pathname: links.leaderboard, changeFrequency: "daily", priority: 0.7 },
] satisfies StaticSitemapEntry[];

function buildAbsoluteUrl(baseUrl: string, pathname: string): string {
  return new URL(pathname, baseUrl).toString();
}

function buildAlternates(
  baseUrl: string,
  pathname: string,
): Record<SupportedLanguageCode, string> {
  const localizedPathnames = getLocalizedPathnames(pathname);
  return Object.fromEntries(
    Object.entries(localizedPathnames).map(([locale, path]) => [
      locale,
      buildAbsoluteUrl(baseUrl, path),
    ]),
  ) as Record<SupportedLanguageCode, string>;
}

function buildLocalizedEntries(
  baseUrl: string,
  options: {
    pathname: string;
    lastModified?: string | Date;
    changeFrequency: ChangeFrequency;
    priority: number;
  },
): MetadataRoute.Sitemap {
  const alternates = buildAlternates(baseUrl, options.pathname);

  return SUPPORTED_LOCALES.map((locale) => ({
    url: buildAbsoluteUrl(baseUrl, withLocalePrefix(options.pathname, locale)),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
    alternates: {
      languages: alternates,
    },
  }));
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
      .flatMap((organization) => [
        ...buildLocalizedEntries(baseUrl, {
          pathname: links.account.byDid(organization.did),
          lastModified: organization.createdAt,
          changeFrequency: "weekly",
          priority: 0.8,
        }),
        ...buildLocalizedEntries(baseUrl, {
          pathname: links.account.bumicerts(organization.did),
          lastModified: organization.createdAt,
          changeFrequency: "weekly",
          priority: 0.75,
        }),
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
      if (!did || !rkey) return [];

      return buildLocalizedEntries(baseUrl, {
        pathname: links.bumicert.view(did, rkey),
        lastModified: activity.metadata?.createdAt ?? undefined,
        changeFrequency: "weekly",
        priority: 0.85,
      });
    });
  } catch (error) {
    console.warn("[sitemap] Failed to build Bumicert entries", error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = requirePublicUrl();
  const generatedAt = new Date();
  const [organizationEntries, bumicertEntries] = await Promise.all([
    getOrganizationSitemapEntries(baseUrl),
    getBumicertSitemapEntries(baseUrl),
  ]);

  return [
    ...STATIC_PUBLIC_ENTRIES.flatMap((entry) =>
      buildLocalizedEntries(baseUrl, {
        ...entry,
        lastModified: generatedAt,
      }),
    ),
    ...organizationEntries,
    ...bumicertEntries,
  ];
}
