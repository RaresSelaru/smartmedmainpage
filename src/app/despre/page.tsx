import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("despre");

export default function DesprePage() {
  return <StandardPage pageKey="despre" />;
}
