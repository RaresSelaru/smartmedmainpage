"use client";

import { useState } from "react";

import { Reveal } from "@/components/animations/reveal";
import { BlogArticleCard } from "@/components/blog/blog-article-card";
import { getBlogPosts } from "@/lib/blog";

const BATCH_SIZE = 6;

export function BlogPrincipalArticles() {
  const posts = getBlogPosts();
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const visiblePosts = posts.slice(0, visibleCount);
  const showLoadMore = visibleCount < posts.length;

  function handleLoadMore() {
    setVisibleCount((current) => Math.min(current + BATCH_SIZE, posts.length));
  }

  return (
    <section className="relative overflow-hidden bg-smart-cream pb-24 text-smart-ink" id="articole">
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

        <div className="mt-12 grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8 xl:gap-y-14">
          {visiblePosts.map((post, index) => (
            <Reveal
              className="relative mx-auto w-full max-w-[440px] hover:z-30"
              delay={Math.min((index % BATCH_SIZE) * 0.04, 0.18)}
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
