import type { Metadata } from "next";

import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { LectiileSmartHero } from "@/components/lectiile-smart/lectiile-smart-hero";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { newsCarousel } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Lecțiile SMART | SmartMed Academy",
  description: "Placeholder — descriere pagină Lecțiile SMART.",
};

export default function LectiileSmartPage() {
  return (
    <>
      <LectiileSmartHero />
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
