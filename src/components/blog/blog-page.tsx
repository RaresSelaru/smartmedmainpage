import { Reveal } from "@/components/animations/reveal";
import { BlogArticleCard } from "@/components/blog/blog-article-card";
import { BlogCategoryFilter } from "@/components/blog/blog-category-filter";
import { BlogNavZone } from "@/components/blog/blog-nav-zone";
import { BlogPrincipalHero } from "@/components/blog/blog-principal-hero";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { getBlogCategory, type BlogCategorySlug, type BlogPost } from "@/lib/blog";
import { newsCarousel } from "@/lib/site-config";

type BlogPageContentProps = {
  activeCategory: BlogCategorySlug;
  heading: string;
  posts: BlogPost[];
  searchQuery?: string;
};

export function BlogPageContent({
  activeCategory,
  heading,
  posts,
  searchQuery,
}: BlogPageContentProps) {
  return (
    <>
      <BlogPrincipalHero />
      <BlogNavZone activeCategory={activeCategory} />
      <section className="bg-smart-cream pt-10 text-smart-ink sm:pt-12">
        <div className="smart-container">
          <Reveal>
            <BlogCategoryFilter activeCategory={searchQuery ? undefined : activeCategory} />
          </Reveal>
        </div>
      </section>
      <BlogArticleSection
        activeCategory={activeCategory}
        heading={heading}
        posts={posts}
        searchQuery={searchQuery}
      />
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


function BlogArticleSection({
  activeCategory,
  heading,
  posts,
  searchQuery,
}: BlogPageContentProps) {
  const activeCategoryLabel = getBlogCategory(activeCategory)?.label ?? "Admitere";

  return (
    <section className="relative overflow-hidden bg-smart-cream pb-20 pt-14 text-smart-ink" id="articole">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-smart-gold/45 to-transparent" />
      <div className="absolute right-[-14rem] top-24 h-[32rem] w-[32rem] rounded-full bg-smart-aqua/16 blur-3xl" />
      <div className="smart-container relative z-10">
        <Reveal>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-smart-teal">
              {searchQuery ? "Căutare în blog" : activeCategoryLabel}
            </p>
            <div className="mt-3 flex items-center gap-5">
              <h2 className="font-serif text-5xl font-semibold italic leading-none tracking-[0.02em] sm:text-6xl">
                {heading}
              </h2>
              <span className="hidden h-px min-w-24 flex-1 bg-gradient-to-r from-smart-gold/58 via-smart-ink/14 to-transparent md:block" />
            </div>
          </div>
        </Reveal>

        {posts.length ? (
          <div className="mt-14 grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8 xl:gap-y-14">
            {posts.map((post, index) => (
              <Reveal
                className="relative mx-auto w-full max-w-[440px] hover:z-30"
                delay={Math.min(index * 0.04, 0.18)}
                key={post.slug}
              >
                <BlogArticleCard
                  href={`/blog/${post.slug}`}
                  imageAlt={post.coverAlt}
                  imageSrc={post.coverImage}
                  publishedAt={post.date}
                  tags={post.tags}
                  title={post.title}
                />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-12 rounded-[30px] border border-smart-abyss/10 bg-white/62 p-8 text-center shadow-[0_20px_58px_rgba(3,17,28,0.10)]">
              <h3 className="font-serif text-4xl font-semibold">Nu am găsit articole</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-smart-ink/62">
                Încearcă o altă categorie sau o căutare mai scurtă.
              </p>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
