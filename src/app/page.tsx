import { AcademicCreationSection } from "@/components/home/AcademicCreationSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HeroSection } from "@/components/home/HeroSection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import {
  PathChoiceSection,
  PathChoiceSectionGroup2,
  PathChoiceSectionGroup3,
} from "@/components/home/PathChoiceSection";
import { lectiiSpecialeCarousel, newsCarousel } from "@/lib/site-config";

export default function Home() {
  return (
    <>
      <HeroSection />
      <AcademicCreationSection />
      <PathChoiceSection />
      <HorizontalScrollSection
        bottomWave="cream"
        description="Ateliere intensive, recapitulări tematice și sesiuni dedicate capitolelor cu cea mai mare miză la admitere."
        eyebrow="Resurse SmartMed"
        heading="Lecții Speciale"
        items={lectiiSpecialeCarousel}
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
