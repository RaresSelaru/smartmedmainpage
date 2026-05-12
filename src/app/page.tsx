import { TealBreakSection } from "@/components/home/FeatureCardGrid";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HeroSection } from "@/components/home/HeroSection";
import {
  PathChoiceSection,
  PathChoiceSectionGroup2,
  PathChoiceSectionGroup3,
} from "@/components/home/PathChoiceSection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <PathChoiceSection />
      <TealBreakSection variant="heading" />
      <PathChoiceSectionGroup2 />
      <TealBreakSection variant="compact" />
      <PathChoiceSectionGroup3 />
      <FinalCTASection />
    </>
  );
}
