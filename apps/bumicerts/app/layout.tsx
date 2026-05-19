import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import {
  Geist,
  Geist_Mono,
  Cormorant_Garamond,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { resolveSupportedLanguage, LANGUAGE_COOKIE_NAME } from "@/lib/i18n/languages";
import { requirePublicUrl } from "@/lib/url";

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

const TITLE = "Bumicerts — Fund Regenerative Impact";
const DESCRIPTION =
  "Bumicerts connects funders with nature stewards doing on-ground regenerative work. Fund verified environmental impact directly.";

export function generateMetadata(): Metadata {
  const baseUrl = requirePublicUrl();
  return {
    metadataBase: new URL(baseUrl),
    title: TITLE,
    description: DESCRIPTION,
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
    robots: "noindex, nofollow",
    openGraph: {
      title: TITLE,
      siteName: "Bumicerts",
      description: DESCRIPTION,
      type: "website",
      url: baseUrl,
      images: [{ url: "/opengraph-image.png", alt: TITLE }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@GainForestNow",
      title: TITLE,
      description: DESCRIPTION,
      images: [{ url: "/opengraph-image.png", alt: TITLE }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const language = resolveSupportedLanguage(
    cookieStore.get(LANGUAGE_COOKIE_NAME)?.value,
  );

  return (
    <html lang={language} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} ${instrumentSerif.variable} antialiased`}
      >
        <Providers initialLanguage={language}>{children}</Providers>
      </body>
    </html>
  );
}
