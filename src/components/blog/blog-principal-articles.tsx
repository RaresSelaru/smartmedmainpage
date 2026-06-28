"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Reveal } from "@/components/animations/reveal";
import { ArticlePhoto } from "@/components/blog/article-photo";
import { formatBlogDate, getBlogPosts, type BlogPost } from "@/lib/blog";

const BATCH_SIZE = 6;

// Articolele dedicate pentru Blog-Principal nu există încă. Deocamdată toate pătratele duc
// către un singur articol exemplu; va fi înlocuit cu link-ul real al fiecărui articol.
const EXAMPLE_ARTICLE_HREF = "/blog/cum-iti-construiesti-ritmul-pentru-admitere";

export function BlogPrincipalArticles() {
  const posts = getBlogPosts();
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  // Butonul există de la încărcarea paginii și dispare doar după o apăsare care nu
  // mai dezvăluie articole noi.
  const [showLoadMore, setShowLoadMore] = useState(true);

  const visiblePosts = posts.slice(0, visibleCount);

  function handleLoadMore() {
    const next = visibleCount + BATCH_SIZE;
    if (next >= posts.length) {
      setVisibleCount(posts.length);
      setShowLoadMore(false);
    } else {
      setVisibleCount(next);
    }
  }

  return (
    <section className="relative overflow-hidden bg-smart-cream pb-24 text-smart-ink">
      <div className="smart-container relative z-10">
        <Reveal>
          <div className="min-w-0">
            <div className="flex items-center gap-5">
              <h2 className="font-serif text-4xl font-semibold italic leading-none tracking-[0.02em] sm:text-5xl">
                CITEȘTE ULTIMELE ARTICOLE!
              </h2>
              <span className="hidden h-px min-w-24 flex-1 bg-gradient-to-r from-smart-gold/58 via-smart-ink/14 to-transparent md:block" />
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {visiblePosts.map((post, index) => (
            <Reveal className="relative hover:z-30" delay={Math.min((index % BATCH_SIZE) * 0.04, 0.18)} key={post.slug}>
              <BlogPrincipalArticleCard post={post} />
            </Reveal>
          ))}
        </div>

        {showLoadMore ? (
          <div className="mt-14 flex justify-center">
            <button
              className="rounded-full border border-smart-abyss/20 bg-smart-white px-9 py-4 text-sm font-bold uppercase tracking-[0.18em] text-smart-ink transition duration-300 hover:border-smart-teal hover:text-smart-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal"
              onClick={handleLoadMore}
              type="button"
            >
              Încarcă mai multe
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function BlogPrincipalArticleCard({ post }: { post: BlogPost }) {
  return (
    <Link
      className="group flex h-full flex-col rounded-[28px] border border-smart-abyss/10 bg-smart-white p-6 shadow-[0_18px_54px_rgba(3,17,28,0.08)] transition duration-500 hover:shadow-[0_26px_76px_rgba(3,17,28,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-smart-teal sm:p-7"
      href={EXAMPLE_ARTICLE_HREF}
    >
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h3 className="font-serif text-2xl font-semibold leading-tight text-smart-ink transition duration-300 group-hover:text-smart-teal sm:text-3xl">
          {post.title}
        </h3>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-smart-aqua/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-smart-teal">
            subtitlu 1
          </span>
          <span className="rounded-full bg-smart-aqua/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-smart-teal">
            subtitlu 2
          </span>
        </div>

        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.11em] text-smart-ink/52">
          {formatBlogDate(post.date)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-6">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            alt="Statui medicale"
            className="object-contain mix-blend-multiply"
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            src="/assets/blog/statui.jpeg"
          />
        </div>
        <div className="aspect-[4/3]">
          <ArticlePhoto />
        </div>
      </div>
    </Link>
  );
}
