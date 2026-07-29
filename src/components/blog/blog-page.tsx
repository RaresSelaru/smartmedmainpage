import Link from "next/link";

import { Reveal } from "@/components/animations/reveal";
import { BlogArticleCard } from "@/components/blog/blog-article-card";
import { BlogCategoryFilter } from "@/components/blog/blog-category-filter";
import { BlogPrincipalHero } from "@/components/blog/blog-principal-hero";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import { type BlogCategorySlug } from "@/lib/blog";
import type { PublicBlogSummary } from "@/lib/content/types";
import { newsCarousel } from "@/lib/site-config";

type BlogPageContentProps = {
  activeCategory?: BlogCategorySlug;
  currentPage?: number;
  errorMessage?: string;
  heading: string;
  posts: PublicBlogSummary[];
  searchQuery?: string;
  totalPages?: number;
};

export function BlogPageContent({
  activeCategory,
  currentPage = 1,
  errorMessage,
  heading,
  posts,
  searchQuery,
  totalPages = 1,
}: BlogPageContentProps) {
  return (
    <>
      <BlogPrincipalHero />
      <section className="bg-smart-cream pb-7 pt-12 text-smart-ink sm:pb-9 sm:pt-14">
        <div className="smart-container relative z-10">
          <Reveal>
            <BlogCategoryFilter activeCategory={searchQuery ? undefined : activeCategory} />
          </Reveal>
        </div>
      </section>
      <BlogArticleSection
        activeCategory={activeCategory}
        currentPage={currentPage}
        errorMessage={errorMessage}
        heading={heading}
        posts={posts}
        searchQuery={searchQuery}
        totalPages={totalPages}
      />
      <div className="relative bg-smart-cream pb-36 sm:pb-48">
        <WaveSeparator fill="teal" variant="relaxed" />
      </div>
      <HorizontalScrollSection
        bottomWave="cream"
        description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admitere"
        eyebrow="Mereu la curent"
        heading="SMARTMED NEWS"
        items={newsCarousel}
      />
      <FinalCTASection />
    </>
  );
}

function BlogArticleSection({
  activeCategory,
  currentPage = 1,
  errorMessage,
  heading,
  posts,
  searchQuery,
  totalPages = 1,
}: BlogPageContentProps) {
  return (
    <section
      className="relative scroll-mt-28 overflow-hidden bg-smart-cream pb-24 pt-8 text-smart-ink sm:pt-10"
      id="articole"
    >
      <div className="absolute right-[-14rem] top-24 h-[32rem] w-[32rem] rounded-full bg-smart-aqua/16 blur-3xl" />
      <div className="smart-container relative z-10">
        <Reveal>
          <div className="min-w-0">
            <div className="flex items-center gap-5">
              <h2 className="font-serif text-4xl font-semibold italic leading-none tracking-[0.02em] sm:text-5xl lg:text-6xl">
                {heading}
              </h2>
              <span className="hidden h-px min-w-24 flex-1 bg-gradient-to-r from-smart-gold/58 via-smart-ink/14 to-transparent md:block" />
            </div>
          </div>
        </Reveal>

        {errorMessage ? (
          <Reveal>
            <div
              className="mt-12 rounded-[30px] border border-smart-gold/30 bg-white/62 p-8 text-center shadow-[0_20px_58px_rgba(3,17,28,0.10)]"
              role="status"
            >
              <h3 className="font-serif text-4xl font-semibold">
                Articolele nu pot fi încărcate
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-smart-ink/62">
                {errorMessage}
              </p>
            </div>
          </Reveal>
        ) : posts.length ? (
          <>
          <div className="mt-10 grid grid-cols-1 gap-x-7 gap-y-12 sm:mt-12 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8 xl:gap-y-14">
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
                  publishedAt={post.publishedAt}
                  tags={post.tags}
                  title={post.title}
                />
              </Reveal>
            ))}
          </div>
          {totalPages > 1 ? (
            <nav
              aria-label="Paginarea articolelor"
              className="mt-14 flex items-center justify-center gap-4"
            >
              {currentPage > 1 ? (
                <Link
                  className="rounded-full border border-smart-teal/25 bg-white/65 px-5 py-3 text-sm font-bold text-smart-teal transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                  href={buildBlogPageHref({
                    activeCategory,
                    page: currentPage - 1,
                    searchQuery,
                  })}
                >
                  Pagina anterioară
                </Link>
              ) : null}
              <span className="text-sm font-semibold text-smart-ink/60">
                Pagina {currentPage} din {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link
                  className="rounded-full border border-smart-teal/25 bg-white/65 px-5 py-3 text-sm font-bold text-smart-teal transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
                  href={buildBlogPageHref({
                    activeCategory,
                    page: currentPage + 1,
                    searchQuery,
                  })}
                >
                  Pagina următoare
                </Link>
              ) : null}
            </nav>
          ) : null}
          </>
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

function buildBlogPageHref({
  activeCategory,
  page,
  searchQuery,
}: {
  activeCategory?: BlogCategorySlug;
  page: number;
  searchQuery?: string;
}) {
  const params = new URLSearchParams();

  if (activeCategory) {
    params.set("categorie", activeCategory);
  }

  if (searchQuery) {
    params.set("cautare", searchQuery);
  }

  if (page > 1) {
    params.set("pagina", String(page));
  }

  const query = params.toString();
  return query ? `/blog?${query}#articole` : "/blog#articole";
}
