import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { resolveSupportedLanguage, type SupportedLanguageCode } from "./i18n/languages";
import { getLocalizedPathnames, withLocalePrefix } from "./i18n/routing";
import { requirePublicUrl } from "./url";

const sharedSocialImage = {
  url: "/opengraph-image.png",
  width: 2136,
  height: 1180,
  alt: "Bumicerts — Fund Regenerative Impact",
};

export const sharedOpenGraphImage = sharedSocialImage;
export const sharedTwitterImage = sharedSocialImage;

export function buildAbsoluteUrl(pathname: string): string {
  return new URL(pathname, requirePublicUrl()).toString();
}

export async function getCurrentSupportedLocale(): Promise<SupportedLanguageCode> {
  return resolveSupportedLanguage(await getLocale());
}

export async function getLocalizedAbsoluteUrl(pathname: string): Promise<string> {
  const locale = await getCurrentSupportedLocale();
  return buildAbsoluteUrl(withLocalePrefix(pathname, locale));
}

export function getLocalizedAbsoluteUrls(
  pathname: string,
): Record<SupportedLanguageCode, string> {
  const localizedPathnames = getLocalizedPathnames(pathname);
  return Object.fromEntries(
    Object.entries(localizedPathnames).map(([locale, path]) => [
      locale,
      buildAbsoluteUrl(path),
    ]),
  ) as Record<SupportedLanguageCode, string>;
}

export async function buildPublicPageMetadata(options: {
  pathname: string;
  title: string;
  description: string;
  imageAlt?: string;
}): Promise<Metadata> {
  const locale = await getCurrentSupportedLocale();
  const canonicalPath = withLocalePrefix(options.pathname, locale);
  const canonicalUrl = buildAbsoluteUrl(canonicalPath);
  const image = {
    ...sharedOpenGraphImage,
    alt: options.imageAlt ?? options.title,
  };

  return {
    title: options.title,
    description: options.description,
    alternates: {
      canonical: canonicalUrl,
      languages: getLocalizedAbsoluteUrls(options.pathname),
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: canonicalUrl,
      siteName: "Bumicerts",
      type: "website",
      locale,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: [image],
    },
  };
}

export function noIndexMetadata(title?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    robots: {
      index: false,
      follow: false,
    },
  };
}

export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
