import type { Metadata } from "next";

import { BlogPageContent } from "@/components/blog/blog-page";
import { getBlogCategory } from "@/lib/blog";
import {
  getPublishedBlogPage,
  isPublicContentUnavailableError,
} from "@/lib/blog-repository";
import { siteConfig } from "@/lib/site-config";

type BlogPageProps = {
  searchParams?: Promise<{
    categorie?: string;
    cautare?: string;
    pagina?: string;
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
  const searchQuery = params?.cautare?.trim().slice(0, 160) || undefined;
  const requestedPage = Number.parseInt(params?.pagina ?? "1", 10);
  let errorMessage: string | undefined;
  let result = {
    items: [],
    page: 1,
    pageSize: 18,
    total: 0,
    totalPages: 1,
  } as Awaited<ReturnType<typeof getPublishedBlogPage>>;

  try {
    result = await getPublishedBlogPage({
      category,
      page: requestedPage,
      query: searchQuery,
    });
  } catch (error) {
    if (!isPublicContentUnavailableError(error)) {
      throw error;
    }

    errorMessage =
      "Încearcă din nou în câteva momente. Nu afișăm copii locale care ar putea fi depășite.";
  }
  const heading = searchQuery
    ? `REZULTATE PENTRU „${searchQuery}”`
    : category
      ? `ARTICOLE: ${getBlogCategory(category)?.label.toLocaleUpperCase("ro-RO")}`
      : "CITEȘTE ULTIMELE ARTICOLE!";

  return (
    <BlogPageContent
      activeCategory={category}
      currentPage={result.page}
      errorMessage={errorMessage}
      heading={heading}
      posts={result.items}
      searchQuery={searchQuery}
      totalPages={result.totalPages}
    />
  );
}
