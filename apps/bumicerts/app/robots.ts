import type { MetadataRoute } from "next";
import { requirePublicUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${requirePublicUrl()}/sitemap.xml`,
  };
}
