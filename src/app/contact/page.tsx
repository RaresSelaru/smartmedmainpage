import type { Metadata } from "next";

import { StandardPage } from "@/components/pages/standard-page";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("contact");

export default function ContactPage() {
  return <StandardPage pageKey="contact" />;
}
