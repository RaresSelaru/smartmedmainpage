import type { Metadata } from "next";

import { BlogPageContent } from "@/components/blog/blog-page";
import {
  defaultBlogCategory,
  getBlogCategory,
  getBlogPostsByCategory,
  searchBlogPosts,
  type BlogCategorySlug,
} from "@/lib/blog";
import { siteConfig } from "@/lib/site-config";

type BlogPageProps = {
  searchParams?: Promise<{
    categorie?: string;
    cautare?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Blog SmartMed",
  description:
    "Ghiduri, strategii și articole SmartMed Academy pentru admiterea la Medicină.",
  openGraph: {
    title: `Blog SmartMed | ${siteConfig.name}`,
    description:
      "Ghiduri, strategii și articole SmartMed Academy pentru admiterea la Medicină.",
    siteName: siteConfig.fullName,
    type: "website",
  },
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const category = getBlogCategory(params?.categorie)?.slug ?? defaultBlogCategory;
  const searchQuery = params?.cautare?.trim();
  const posts = searchQuery
    ? searchBlogPosts(searchQuery)
    : getBlogPostsByCategory(category as BlogCategorySlug);
  const heading = searchQuery
    ? `Rezultate pentru “${searchQuery}”`
    : (getBlogCategory(category)?.label ?? "Admitere");

  return (
    <BlogPageContent
      activeCategory={category as BlogCategorySlug}
      heading={heading}
      posts={posts}
      searchQuery={searchQuery}
    />
  );
}
