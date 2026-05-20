import type { MetadataRoute } from "next";
import { SUPPORTED_LOCALES } from "@/lib/i18n/languages";
import { getLocalizedPathnames, withLocalePrefix } from "@/lib/i18n/routing";
import { requirePublicUrl } from "@/lib/url";

const STATIC_SEO_PATHS = [
  "/",
  "/home",
  "/explore",
  "/organizations",
  "/leaderboard",
  "/upload",
  "/upload/sites",
  "/upload/audio",
  "/upload/trees",
  "/bumicert/create",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = requirePublicUrl();

  return STATIC_SEO_PATHS.flatMap((pathname) => {
    const alternates = Object.fromEntries(
      Object.entries(getLocalizedPathnames(pathname)).map(([locale, path]) => [
        locale,
        new URL(path, baseUrl).toString(),
      ]),
    );

    return SUPPORTED_LOCALES.map((locale) => ({
      url: new URL(withLocalePrefix(pathname, locale), baseUrl).toString(),
      alternates: {
        languages: alternates,
      },
    }));
  });
}
