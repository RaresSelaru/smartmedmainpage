import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("pentru-parinti");

export default function PentruParintiPage() {
  return <StandardPage pageKey="pentru-parinti" />;
}
