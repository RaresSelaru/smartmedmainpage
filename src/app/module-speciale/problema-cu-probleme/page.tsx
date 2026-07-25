import type { Metadata } from "next";

import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { ProblemaCuProblemeHero } from "@/components/problema-cu-probleme/problema-cu-probleme-hero";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { newsCarousel } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Problema cu problemele | SmartMed Academy",
  description: "Placeholder — descriere pagină Problema cu problemele.",
};

export default function ProblemaCuProblemePage() {
  return (
    <>
      <ProblemaCuProblemeHero />
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
