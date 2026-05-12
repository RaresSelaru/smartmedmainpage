"use client";

import { usePathname } from "next/navigation";

import { BlogSecondaryNav } from "@/components/blog/blog-secondary-nav";
import { useBlogNavCollection } from "@/components/blog/use-blog-nav-collection";
import type { BlogCategorySlug } from "@/lib/blog";

type BlogNavZoneProps = {
  activeCategory?: BlogCategorySlug;
};

export function BlogNavZone({ activeCategory }: BlogNavZoneProps) {
  const pathname = usePathname();
  const collected = useBlogNavCollection(true, pathname);

  return (
    <section className="relative z-20 bg-smart-abyss pb-5 pt-3">
      <div aria-hidden="true" className="absolute -top-3 h-px w-px" id="blog-secondary-nav-sentinel" />
      <div className="smart-container rounded-full border border-white/[0.07] bg-white/[0.025] px-2 py-1.5 backdrop-blur-md lg:border-transparent lg:bg-transparent lg:px-0">
        <BlogSecondaryNav activeCategory={activeCategory} disabled={collected} visible={!collected} />
      </div>
    </section>
  );
}
