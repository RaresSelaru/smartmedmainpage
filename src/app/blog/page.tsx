import type { Metadata } from "next";

import { BlogPageContent } from "@/components/blog/blog-page";
import {
  getBlogCategory,
  getBlogPosts,
  getBlogPostsByCategory,
  searchBlogPosts,
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
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: `Blog SmartMed | ${siteConfig.name}`,
    description:
      "Ghiduri, strategii și articole SmartMed Academy pentru admiterea la Medicină.",
    siteName: siteConfig.fullName,
    type: "website",
    url: "/blog",
  },
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const category = getBlogCategory(params?.categorie)?.slug;
  const searchQuery = params?.cautare?.trim();
  const posts = searchQuery
    ? searchBlogPosts(searchQuery)
    : category
      ? getBlogPostsByCategory(category)
      : getBlogPosts();
  const heading = searchQuery
    ? `REZULTATE PENTRU „${searchQuery}”`
    : category
      ? `ARTICOLE: ${getBlogCategory(category)?.label.toLocaleUpperCase("ro-RO")}`
      : "CITEȘTE ULTIMELE ARTICOLE!";

  return (
    <BlogPageContent
      activeCategory={category}
      heading={heading}
      posts={posts}
      searchQuery={searchQuery}
    />
  );
}
