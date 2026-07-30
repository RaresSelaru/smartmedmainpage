import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, UserRound } from "lucide-react";

import { Reveal } from "@/components/animations/reveal";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HorizontalScrollSection } from "@/components/home/HorizontalScrollSection";
import { WaveSeparator } from "@/components/ui/WaveSeparator";
import {
  formatBlogDate,
  getBlogCategory,
} from "@/lib/blog";
import { ContentRenderer } from "@/lib/content/renderer";
import type { PublicBlogPost, PublicBlogSummary } from "@/lib/content/types";
import { newsCarousel } from "@/lib/site-config";

type BlogPostPageContentProps = {
  post: PublicBlogPost;
  relatedPosts: PublicBlogSummary[];
};

export function BlogPostPageContent({
  post,
  relatedPosts,
}: BlogPostPageContentProps) {
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

          <div className="mt-9 grid gap-9 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <Reveal>
              <div>
                <span className="rounded-full border border-smart-gold/28 bg-smart-gold/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-smart-gold-light">
                  {categoryLabel}
                </span>
                <h1 className="mt-6 max-w-4xl font-serif text-4xl font-semibold leading-[1] tracking-[-0.02em] sm:text-6xl lg:text-[4.25rem]">
                  {post.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-smart-white/76 sm:text-lg sm:leading-8">
                  {post.excerpt}
                </p>
                <div className="mt-7 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.12em] text-smart-white/58">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays aria-hidden="true" className="size-4 text-smart-aqua" />
                    <time dateTime={post.publishedAt}>
                      {formatBlogDate(post.publishedAt)}
                    </time>
                  </span>
                  {post.modifiedAt.slice(0, 10) !==
                  post.publishedAt.slice(0, 10) ? (
                    <span>
                      Actualizat{" "}
                      <time dateTime={post.modifiedAt}>
                        {formatBlogDate(post.modifiedAt)}
                      </time>
                    </span>
                  ) : null}
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
                  unoptimized={/^https?:\/\//u.test(post.coverImage)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-smart-abyss/42 via-transparent to-transparent" />
              </div>
            </Reveal>
          </div>
        </div>
      </article>

      <section className="bg-smart-cream py-12 text-smart-ink sm:py-16 lg:py-20">
        <div className="blog-reading-layout">
          <Reveal className="min-w-0">
            <div className="rounded-[24px] border border-smart-abyss/10 bg-white/72 p-6 shadow-[0_18px_58px_rgba(3,17,28,0.1)] sm:rounded-[28px] sm:p-10 lg:p-12">
              <div className="prose-smart">
                <ContentRenderer
                  document={post.document}
                  entryId={post.id}
                  schemaVersion={1}
                />
              </div>
              {post.correctionNote ? (
                <aside
                  className="mt-10 rounded-3xl border border-smart-gold/30 bg-smart-gold/10 p-5 text-sm leading-7 text-smart-ink/75"
                  role="note"
                >
                  <strong>Notă de corecție:</strong> {post.correctionNote}
                </aside>
              ) : null}
              {post.disclaimer ? (
                <aside
                  className="mt-6 rounded-3xl border border-smart-teal/25 bg-smart-teal/8 p-5 text-sm leading-7 text-smart-ink/75"
                  role="note"
                >
                  <strong>Notă medicală:</strong> {post.disclaimer}
                </aside>
              ) : null}
              {post.reviewer ? (
                <p className="mt-6 text-sm text-smart-ink/60">
                  Revizuit de {post.reviewer}
                  {post.reviewedAt ? (
                    <>
                      {" "}
                      la <time dateTime={post.reviewedAt}>{formatBlogDate(post.reviewedAt)}</time>
                    </>
                  ) : null}
                  .
                </p>
              ) : null}
            </div>
          </Reveal>
          <Reveal className="xl:sticky xl:top-28" delay={0.08}>
            <aside className="rounded-[26px] border border-smart-abyss/10 bg-smart-abyss p-6 text-smart-white shadow-[0_20px_58px_rgba(3,17,28,0.16)]">
              <h2 className="font-serif text-3xl font-semibold">Articole similare</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                {relatedPosts.length ? (
                  relatedPosts.map((related) => (
                    <Link
                      className="group rounded-3xl border border-white/10 bg-white/[0.055] p-4 transition hover:border-smart-aqua/40 hover:bg-white/[0.09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-aqua"
                      href={`/blog/${related.slug}`}
                      key={related.slug}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-smart-gold-light">
                        {getBlogCategory(related.category)?.label ?? "Blog"}
                      </span>
                      <h3 className="mt-2 font-serif text-[1.4rem] font-semibold leading-[1.08] text-smart-white">
                        {related.title}
                      </h3>
                      <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-smart-aqua">
                        Citește
                        <ArrowRight aria-hidden="true" className="size-4 transition group-hover:translate-x-1" />
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-smart-white/64">
                    Nu există încă recomandări pentru acest articol.
                  </p>
                )}
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
        description="Anunțuri oficiale, modificări de calendar, evenimente și actualizări relevante pentru admitere"
        eyebrow="Mereu la curent"
        heading="SMARTMED NEWS"
        items={newsCarousel}
      />
      <FinalCTASection />
    </>
  );
}
