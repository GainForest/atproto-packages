import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Cormorant_Garamond,
  Instrument_Serif,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import "./globals.css";
import { Providers } from "./providers";
import { requirePublicUrl } from "@/lib/url";
import { resolveSupportedLanguage } from "@/lib/i18n/languages";
import { jsonLd } from "@/lib/seo-metadata";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-garamond-var",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  style: ["normal"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif-var",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = requirePublicUrl();
  const locale = resolveSupportedLanguage(await getLocale());
  const t = await getTranslations("common.seo");
  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: "%s — Bumicerts",
    },
    description,
    applicationName: "Bumicerts",
    authors: [{ name: "GainForest", url: "https://gainforest.earth" }],
    keywords: [
      "bumicerts",
      "fund",
      "regenerative",
      "impact",
      "conservation",
      "nature",
      "forest",
      "carbon",
      "gainforest",
      "earth",
    ],
    creator: "GainForest",
    publisher: "GainForest",
    referrer: "origin",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: [
      { rel: "icon", url: "/favicon.ico" },
      {
        rel: "icon",
        url: "/favicon-dark.ico",
        media: "(prefers-color-scheme: dark)",
      },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    ],
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      siteName: "Bumicerts",
      description,
      type: "website",
      locale,
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@GainForestNow",
      title,
      description,
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: title }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function buildRootStructuredData(description: string): Record<string, unknown>[] {
  const baseUrl = requirePublicUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseUrl}#website`,
      name: "Bumicerts",
      url: baseUrl,
      description,
      publisher: {
        "@id": `${baseUrl}#organization`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
      name: "GainForest",
      url: "https://gainforest.earth",
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/apple-touch-icon.png`,
        width: 180,
        height: 180,
      },
      sameAs: [
        "https://gainforest.earth",
        "https://github.com/GainForest",
        "https://x.com/GainForestNow",
      ],
    },
  ];
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("common.seo");
  const structuredData = buildRootStructuredData(t("description"));

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} ${instrumentSerif.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
