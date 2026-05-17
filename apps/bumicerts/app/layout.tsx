import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Cormorant_Garamond,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
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
    title: {
      default: TITLE,
      template: "%s — Bumicerts",
    },
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
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: TITLE,
      siteName: "Bumicerts",
      description: DESCRIPTION,
      type: "website",
      url: baseUrl,
      images: [
        {
          url: "/opengraph-image.png",
          width: 2136,
          height: 1180,
          alt: TITLE,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: "@GainForestNow",
      title: TITLE,
      description: DESCRIPTION,
      images: [
        {
          url: "/opengraph-image.png",
          width: 2136,
          height: 1180,
          alt: TITLE,
        },
      ],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function buildRootStructuredData(): Record<string, unknown>[] {
  const baseUrl = requirePublicUrl();

  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${baseUrl}#website`,
      name: "Bumicerts",
      url: baseUrl,
      description: DESCRIPTION,
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = buildRootStructuredData();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorantGaramond.variable} ${instrumentSerif.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
