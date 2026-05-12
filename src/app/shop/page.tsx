import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("shop");

export default function ShopPage() {
  return <StandardPage pageKey="shop" />;
}
