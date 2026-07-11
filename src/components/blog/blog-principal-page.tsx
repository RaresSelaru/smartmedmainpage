import { Reveal } from "@/components/animations/reveal";
import { BlogCategoryFilter } from "@/components/blog/blog-category-filter";
import { BlogPrincipalArticles } from "@/components/blog/blog-principal-articles";
import { BlogPrincipalHero } from "@/components/blog/blog-principal-hero";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { newsCarousel } from "@/lib/site-config";

export function BlogPrincipalPageContent() {
  return (
    <>
      <BlogPrincipalHero />
      <BlogPrincipalCategories />
      <BlogPrincipalArticles />
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

function BlogPrincipalCategories() {
  return (
    <section className="relative overflow-hidden bg-smart-cream py-10 text-smart-ink sm:py-12">
      <div className="smart-container relative z-10">
        <Reveal>
          <BlogCategoryFilter />
        </Reveal>
      </div>
    </section>
  );
}
