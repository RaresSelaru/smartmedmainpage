import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, UserRound } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { BlogNavZone } from "@/components/blog/blog-nav-zone";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import {
  formatBlogDate,
  getBlogCategory,
  type BlogBodyBlock,
  type BlogPost,
} from "@/lib/blog";
import { newsCarousel } from "@/lib/site-config";

type BlogPostPageContentProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
};

export function BlogPostPageContent({ post, relatedPosts }: BlogPostPageContentProps) {
  const categoryLabel = getBlogCategory(post.category)?.label ?? "Blog";

  return (
    <>
      <article className="relative isolate overflow-hidden bg-smart-abyss pb-10 pt-32 text-smart-white sm:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(156,206,208,0.18),transparent_34%),linear-gradient(135deg,#03111c,#061622_58%,#082030)]" />
        <div className="grain-overlay" />
        <div className="smart-container relative z-10">
          <Reveal>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-smart-white/78 transition hover:border-smart-aqua/50 hover:text-smart-aqua focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
              href="/blog#articole"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Înapoi la blog
            </Link>
          </Reveal>

          <div className="mt-10 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <Reveal>
              <div>
                <span className="rounded-full border border-smart-gold/28 bg-smart-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-smart-gold-light">
                  {categoryLabel}
                </span>
                <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[0.96] tracking-[-0.025em] sm:text-7xl">
                  {post.title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-smart-white/76">
                  {post.excerpt}
                </p>
                <div className="mt-7 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.12em] text-smart-white/58">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4 text-smart-aqua" />
                    {formatBlogDate(post.date)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 aria-hidden="true" className="size-4 text-smart-aqua" />
                    {post.readTime}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <UserRound aria-hidden="true" className="size-4 text-smart-aqua" />
                    {post.author}
                  </span>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="relative aspect-[1.32] overflow-hidden rounded-[32px] border border-white/14 bg-white/8 shadow-[0_30px_88px_rgba(0,0,0,0.34)]">
                <Image
                  alt={post.coverAlt}
                  className="object-cover"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 54vw"
                  src={post.coverImage}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-smart-abyss/42 via-transparent to-transparent" />
              </div>
            </Reveal>
          </div>
        </div>
      </article>

      <BlogNavZone activeCategory={post.category} />

      <section className="bg-smart-cream py-20 text-smart-ink">
        <div className="smart-container grid gap-10 lg:grid-cols-[minmax(0,800px)_340px] lg:items-start">
          <Reveal>
            <div className="rounded-[32px] border border-smart-abyss/10 bg-white/66 p-6 shadow-[0_22px_70px_rgba(3,17,28,0.12)] sm:p-10">
              <div className="prose-smart">
                {post.body.map((block, index) => (
                  <BlogBody block={block} key={`${post.slug}-${block.type}-${index}`} />
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <aside className="rounded-[30px] border border-smart-abyss/10 bg-smart-abyss p-6 text-smart-white shadow-[0_22px_70px_rgba(3,17,28,0.18)]">
              <h2 className="font-serif text-3xl font-semibold">Articole similare</h2>
              <div className="mt-6 grid gap-4">
                {relatedPosts.map((related) => (
                  <Link
                    className="group rounded-3xl border border-white/10 bg-white/[0.055] p-4 transition hover:border-smart-aqua/40 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
                    href={`/blog/${related.slug}`}
                    key={related.slug}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-smart-gold-light">
                      {getBlogCategory(related.category)?.label ?? "Blog"}
                    </span>
                    <h3 className="mt-2 font-serif text-2xl font-semibold leading-none text-smart-white">
                      {related.title}
                    </h3>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-smart-aqua">
                      Citește
                      <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            </aside>
          </Reveal>
        </div>
      </section>
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

function BlogBody({ block }: { block: BlogBodyBlock }) {
  if (block.type === "heading") {
    return <h2>{block.text}</h2>;
  }

  if (block.type === "list") {
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  return <p>{block.text}</p>;
}
