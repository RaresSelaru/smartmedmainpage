import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { BlogNavZone } from "@/components/blog/blog-nav-zone";
import {
  blogHeroImage,
  formatBlogDate,
  getBlogCategory,
  type BlogCategorySlug,
  type BlogPost,
} from "@/lib/blog";
import { cn } from "@/lib/utils";

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
      <BlogHero />
      <BlogNavZone activeCategory={activeCategory} />
      <BlogArticleSection
        activeCategory={activeCategory}
        heading={heading}
        posts={posts}
        searchQuery={searchQuery}
      />
    </>
  );
}

function BlogHero() {
  return (
    <section className="relative isolate overflow-hidden bg-smart-abyss pb-4 pt-32 text-smart-white sm:pb-6 sm:pt-36">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(156,206,208,0.18),transparent_32%),linear-gradient(135deg,#03111c_0%,#061622_48%,#082030_100%)]" />
      <div className="grain-overlay" />
      <div className="smart-container relative z-10">
        <Reveal>
          <div className="relative h-[300px] overflow-hidden rounded-[30px] border border-white/14 bg-smart-deep shadow-[0_32px_92px_rgba(0,0,0,0.34)] sm:h-[340px] lg:h-[370px] 2xl:h-[388px]">
            <Image
              alt="SmartMed Academy Blog - ghiduri pentru admiterea la Medicină"
              className="object-cover object-[62%_center] sm:object-center"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1380px"
              src={blogHeroImage}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,17,28,0.98)_0%,rgba(6,22,34,0.92)_24%,rgba(6,22,34,0.50)_45%,rgba(6,22,34,0.12)_69%,rgba(6,22,34,0.03)_100%),radial-gradient(circle_at_20%_48%,rgba(31,111,120,0.34),transparent_38%),linear-gradient(to_bottom,rgba(3,17,28,0.08),rgba(3,17,28,0.26))]" />
            <div className="absolute inset-y-0 left-0 flex w-full max-w-xl flex-col justify-center px-7 py-8 sm:px-10 lg:px-12">
              <p className="text-xs font-bold uppercase tracking-[0.36em] text-smart-gold-light">
                SmartMed Academy
              </p>
              <h1 className="mt-4 font-serif text-[72px] font-semibold italic leading-[0.78] text-smart-white drop-shadow-[0_8px_26px_rgba(0,0,0,0.35)] sm:text-[104px] lg:text-[124px]">
                BLOG
              </h1>
              <p className="mt-6 max-w-md font-serif text-3xl font-semibold italic leading-[1.04] text-smart-cream sm:text-4xl">
                Navighează cu succes prin hățișul admiterii
              </p>
              <div className="mt-7 h-px w-44 bg-gradient-to-r from-smart-gold-light via-smart-aqua to-transparent" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
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
    <section className="relative overflow-hidden bg-smart-cream py-20 text-smart-ink" id="articole">
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
          <div className="mt-14 grid gap-16 lg:gap-20">
            {posts.map((post, index) => (
              <BlogArticleCard index={index} key={post.slug} post={post} />
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

function BlogArticleCard({ index, post }: { index: number; post: BlogPost }) {
  const imageFirst = index % 2 === 1;
  const categoryLabel = getBlogCategory(post.category)?.label ?? "Blog";

  return (
    <Reveal delay={Math.min(index * 0.04, 0.18)}>
      <article className="group grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <Link
          aria-label={`Citește articolul ${post.title}`}
          className={cn(
            "relative block aspect-[1.48] min-h-[260px] overflow-hidden rounded-[30px] border border-smart-abyss/10 bg-smart-deep shadow-[0_24px_70px_rgba(3,17,28,0.14)] transition duration-500 hover:shadow-[0_30px_88px_rgba(3,17,28,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal",
            imageFirst ? "lg:order-1" : "lg:order-2",
          )}
          href={`/blog/${post.slug}`}
        >
          <Image
            alt={post.coverAlt}
            className="object-cover transition duration-700 group-hover:scale-[1.045]"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            src={post.coverImage}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-smart-abyss/52 via-smart-abyss/6 to-transparent opacity-80" />
        </Link>

        <div className={cn("px-1 py-2 sm:px-3 lg:px-5", imageFirst ? "lg:order-2" : "lg:order-1")}>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-smart-teal">
            {categoryLabel}
          </span>
          <h3 className="mt-5 max-w-2xl origin-left font-serif text-4xl font-semibold leading-[0.98] text-smart-ink transition duration-300 group-hover:scale-[1.015] group-hover:text-smart-teal sm:text-5xl">
            <Link className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal" href={`/blog/${post.slug}`}>
              {post.title}
            </Link>
          </h3>
          <p className="mt-5 max-w-xl text-sm leading-7 text-smart-ink/66 sm:text-base">
            {post.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-[0.11em] text-smart-ink/52">
            <span className="inline-flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-4 text-smart-teal" />
              {formatBlogDate(post.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4 text-smart-teal" />
              {post.readTime}
            </span>
          </div>
          <Link
            className="mt-7 inline-flex items-center gap-3 text-sm font-bold text-smart-teal transition duration-300 hover:text-smart-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
            href={`/blog/${post.slug}`}
          >
            Citește articolul
            <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </article>
    </Reveal>
  );
}
