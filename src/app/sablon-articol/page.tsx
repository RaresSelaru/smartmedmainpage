import type { Metadata } from "next";

import { SablonArticolPageContent } from "@/components/blog/sablon-articol-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Șablon Articol SmartMed",
  description:
    "Șablon de articol SmartMed Academy — structură demonstrativă cu placeholdere pentru titlu, text și imagini.",
  openGraph: {
    title: `Șablon Articol SmartMed | ${siteConfig.name}`,
    description:
      "Șablon de articol SmartMed Academy — structură demonstrativă cu placeholdere pentru titlu, text și imagini.",
    siteName: siteConfig.fullName,
    type: "article",
  },
};

export default function SablonArticolPage() {
  return <SablonArticolPageContent />;
}
