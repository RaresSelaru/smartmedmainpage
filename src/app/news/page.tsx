import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("news");

export default function NewsPage() {
  return <StandardPage pageKey="news" />;
}
