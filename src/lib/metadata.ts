import type { Metadata } from "next";

import { pageScaffolds, siteConfig, type PageKey } from "@/lib/site-config";

export function createPageMetadata(pageKey: PageKey): Metadata {
  const page = pageScaffolds[pageKey];

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: `${page.title} | ${siteConfig.name}`,
      description: page.description,
      siteName: siteConfig.fullName,
      type: "website",
    },
  };
}
