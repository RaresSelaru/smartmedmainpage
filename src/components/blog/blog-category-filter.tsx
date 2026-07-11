import Link from "next/link";

import { blogCategories, type BlogCategorySlug } from "@/lib/blog";
import { cn } from "@/lib/utils";

type BlogCategoryFilterProps = {
  activeCategory?: BlogCategorySlug;
  className?: string;
};

const categoryLinkClass =
  "inline-flex min-h-9 shrink-0 snap-start items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.13em] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal sm:text-[11px]";

function categoryStateClass(active: boolean) {
  return active
    ? "border-smart-gold/62 bg-[linear-gradient(135deg,#1f6f78_0%,#164b58_100%)] text-smart-white shadow-[0_9px_24px_rgba(18,75,88,0.20),inset_0_1px_0_rgba(255,255,255,0.18)]"
    : "border-smart-abyss/11 bg-smart-white/64 text-smart-ink/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.58)] hover:-translate-y-px hover:border-smart-teal/42 hover:bg-smart-white hover:text-smart-teal";
}

export function BlogCategoryFilter({
  activeCategory,
  className,
}: BlogCategoryFilterProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-5">
        <h2
          className="shrink-0 font-serif text-4xl font-semibold italic leading-none tracking-[0.02em] sm:text-5xl lg:text-6xl"
          id="blog-categories-heading"
        >
          CATEGORII
        </h2>
        <span
          aria-hidden="true"
          className="hidden h-px min-w-24 flex-1 bg-gradient-to-r from-smart-gold/58 via-smart-ink/14 to-transparent md:block"
        />
      </div>

      <nav
        aria-labelledby="blog-categories-heading"
        className="relative isolate mt-5 overflow-hidden rounded-[20px] border border-smart-abyss/10 bg-smart-white/46 p-2 shadow-[0_12px_34px_rgba(3,17,28,0.055),inset_0_1px_0_rgba(255,255,255,0.52)] sm:mt-6 sm:p-2.5"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_4%_0%,rgba(200,168,117,0.15),transparent_24%),linear-gradient(110deg,rgba(255,255,255,0.30),transparent_48%,rgba(156,206,208,0.08))]"
        />
        <div className="no-scrollbar flex snap-x gap-1.5 overflow-x-auto p-0.5 lg:flex-wrap lg:justify-center lg:gap-2 lg:overflow-visible lg:snap-none">
          <Link
            aria-current={activeCategory === undefined ? "page" : undefined}
            className={cn(categoryLinkClass, categoryStateClass(activeCategory === undefined))}
            href="/blog#articole"
            prefetch={false}
          >
            {activeCategory === undefined ? (
              <span aria-hidden="true" className="size-1.5 rounded-full bg-smart-gold-light" />
            ) : null}
            Toate
          </Link>

          {blogCategories.map((category) => {
            const active = activeCategory === category.slug;

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(categoryLinkClass, categoryStateClass(active))}
                href={`/blog?categorie=${category.slug}#articole`}
                key={category.slug}
                prefetch={false}
              >
                {active ? (
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-smart-gold-light" />
                ) : null}
                {category.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
