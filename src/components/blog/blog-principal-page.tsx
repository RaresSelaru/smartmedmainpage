import Link from "next/link";

import { Reveal } from "@/components/animations/reveal";
import { BlogPrincipalArticles } from "@/components/blog/blog-principal-articles";
import { BlogPrincipalHero } from "@/components/blog/blog-principal-hero";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { blogCategories } from "@/lib/blog";
import { newsCarousel } from "@/lib/site-config";

export function BlogPrincipalPageContent() {
  return (
    <>
      <BlogPrincipalHero />
      <BlogPrincipalCategories />
      <BlogPrincipalArticles />
      <HorizontalScrollSection
        bottomWave="cream"
        description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admiterea 2026."
        eyebrow="Mereu la curent"
        heading="SmartMed News"
        items={newsCarousel}
      />
    </>
  );
}

function BlogPrincipalCategories() {
  return (
    <section className="relative overflow-hidden bg-smart-cream py-20 text-smart-ink">
      <div className="smart-container relative z-10">
        <Reveal>
          <div className="min-w-0">
            <div className="flex items-center gap-5">
              <h2 className="font-serif text-5xl font-semibold italic leading-none tracking-[0.02em] sm:text-6xl">
                CATEGORII
              </h2>
              <span className="h-px min-w-24 flex-1 bg-gradient-to-r from-smart-gold/58 via-smart-ink/14 to-transparent" />
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {blogCategories.map((category) => (
              <Link
                className="rounded-full border border-smart-abyss/15 bg-white px-5 py-3 text-center text-sm font-bold uppercase tracking-[0.13em] text-smart-ink transition duration-300 hover:border-smart-teal hover:text-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                href={`/blog-principal/${category.slug}`}
                key={category.slug}
              >
                {category.label}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
