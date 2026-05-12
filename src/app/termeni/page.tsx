import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("termeni");

export default function TermeniPage() {
  return <StandardPage pageKey="termeni" />;
}
