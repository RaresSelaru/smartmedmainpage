import type { Metadata } from "next";

import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { StandardPage } from "@/components/pages/standard-page";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { createPageMetadata } from "@/lib/metadata";
import { newsCarousel } from "@/lib/site-config";

export const metadata: Metadata = createPageMetadata("simulari-smart");

export default function SimulariSmartPage() {
  return (
    <>
      <StandardPage pageKey="simulari-smart" />
      <div className="relative bg-smart-cream pb-36 sm:pb-48">
        <WaveSeparator fill="teal" variant="relaxed" />
      </div>
      <HorizontalScrollSection
        bottomWave="cream"
        description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admiterea 2026."
        eyebrow="Mereu la curent"
        heading="SmartMed News"
        items={newsCarousel}
      />
      <FinalCTASection />
    </>
  );
}
