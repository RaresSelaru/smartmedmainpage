import type { Metadata } from "next";

import { BlogPrincipalPageContent } from "@/components/blog/blog-principal-page";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Blog Principal SmartMed",
  description:
    "Ghiduri, strategii și articole SmartMed Academy pentru admiterea la Medicină.",
  openGraph: {
    title: `Blog Principal SmartMed | ${siteConfig.name}`,
    description:
      "Ghiduri, strategii și articole SmartMed Academy pentru admiterea la Medicină.",
    siteName: siteConfig.fullName,
    type: "website",
  },
};

export default function BlogPrincipalPage() {
  return <BlogPrincipalPageContent />;
}
