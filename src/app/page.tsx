import { AcademicCreationSection } from "@/components/home/AcademicCreationSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HeroSection } from "@/components/home/HeroSection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import {
  PathChoiceSection,
  PathChoiceSectionGroup2,
  PathChoiceSectionGroup3,
} from "@/components/home/PathChoiceSection";
import { SpecialModulesSection } from "@/components/home/SpecialModulesSection";
import { moduleSpecialeCarousel, newsCarousel } from "@/lib/site-config";

export default function Home() {
  return (
    <>
      <HeroSection />
      <AcademicCreationSection />
      <PathChoiceSection />
      <SpecialModulesSection
        description="Module tematice pentru concepte, conexiuni și strategii care completează pregătirea pentru admitere."
        eyebrow="Resurse SmartMed"
        heading="Module speciale"
        items={moduleSpecialeCarousel}
      />
      <PathChoiceSectionGroup2 />
      <HorizontalScrollSection
        bottomWave="cream"
        description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admiterea 2026."
        eyebrow="Mereu la curent"
        heading="SmartMed News"
        items={newsCarousel}
      />
      <PathChoiceSectionGroup3 />
      <FinalCTASection />
    </>
  );
}
