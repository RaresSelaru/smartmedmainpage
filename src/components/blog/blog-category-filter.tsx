import Link from "next/link";

import { blogCategories, type BlogCategorySlug } from "@/lib/blog";
import { cn } from "@/lib/utils";

type BlogCategoryFilterProps = {
  activeCategory?: BlogCategorySlug;
  className?: string;
};

const categoryLinkClass =
  "inline-flex min-h-9 shrink-0 snap-start items-center justify-center whitespace-nowrap rounded-full border px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-smart-teal sm:min-h-8 sm:px-3 sm:py-1.5 sm:text-[11px]";

function categoryStateClass(active: boolean) {
  return active
    ? "border-smart-teal/70 bg-smart-teal text-smart-white shadow-[0_8px_22px_rgba(31,111,120,0.22)]"
    : "border-smart-abyss/12 bg-smart-white/68 text-smart-ink/68 hover:-translate-y-px hover:border-smart-teal/42 hover:bg-smart-white hover:text-smart-teal";
}

export function BlogCategoryFilter({
  activeCategory,
  className,
}: BlogCategoryFilterProps) {
  return (
    <nav
      aria-label="Filtrează articolele după categorie"
      className={cn(
        "relative isolate overflow-hidden rounded-[24px] border border-smart-abyss/10 bg-smart-white/58 px-4 py-4 shadow-[0_16px_46px_rgba(3,17,28,0.08)] sm:px-5 sm:py-4",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_0%,rgba(200,168,117,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.36),transparent_54%,rgba(156,206,208,0.10))]"
      />

      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="size-1.5 shrink-0 rounded-full bg-smart-gold shadow-[0_0_0_4px_rgba(200,168,117,0.12)]"
        />
        <h2 className="shrink-0 text-[11px] font-bold uppercase tracking-[0.24em] text-smart-teal sm:text-xs">
          Categorii
        </h2>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-r from-smart-gold/48 via-smart-abyss/10 to-transparent"
        />
      </div>

      <div className="no-scrollbar -mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Link
          aria-current={activeCategory === undefined ? "page" : undefined}
          className={cn(categoryLinkClass, categoryStateClass(activeCategory === undefined))}
          href="/blog-principal#articole"
          prefetch={false}
        >
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
              {category.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
