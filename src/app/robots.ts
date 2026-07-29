import type { MetadataRoute } from "next";

import { absoluteSiteUrl } from "@/lib/content/seo";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/auth/",
        "/cautare",
        "/cont",
        "/sablon-articol",
      ],
    },
    sitemap: absoluteSiteUrl(siteConfig.url, "/sitemap.xml"),
    host: siteConfig.url,
  };
}
