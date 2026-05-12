import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("cont");

export default function ContPage() {
  return <StandardPage pageKey="cont" />;
}
