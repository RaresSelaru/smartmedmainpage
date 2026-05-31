import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { BlogNavZone } from "@/components/blog/blog-nav-zone";
import {
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
          <div className="overflow-hidden rounded-[30px] border border-white/14 bg-smart-deep shadow-[0_32px_92px_rgba(0,0,0,0.34)]">
            <div className="flex flex-col items-center md:flex-row">
              <div className="w-full overflow-hidden bg-smart-cream md:w-1/2">
                <Image
                  alt="SmartMed Academy Blog"
                  className="my-[-20%] h-auto w-full mix-blend-multiply md:my-[-12%]"
                  height={1080}
                  priority
                  src="/assets/blog/blog-hero-text.jpeg"
                  width={1080}
                />
              </div>
              <div className="relative z-10 -mt-[15%] w-full overflow-hidden bg-smart-cream md:z-auto md:mt-0 md:w-1/2">
                <Image
                  alt="Statui medicale"
                  className="h-auto w-full mix-blend-multiply md:my-[-12%]"
                  height={1080}
                  src="/assets/blog/statui.jpeg"
                  width={1080}
                />
              </div>
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
