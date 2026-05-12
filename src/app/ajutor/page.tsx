import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("ajutor");

export default function AjutorPage() {
  return <StandardPage pageKey="ajutor" />;
}
