import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("simulari-smart");

export default function SimulariSmartPage() {
  return <StandardPage pageKey="simulari-smart" />;
}
