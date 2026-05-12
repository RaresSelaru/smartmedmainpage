import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogPostPageContent } from "@/components/blog/blog-post-page";
import { getBlogPostBySlug, getBlogPosts, getRelatedBlogPosts } from "@/lib/blog";
import { siteConfig } from "@/lib/site-config";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | ${siteConfig.name}`,
      description: post.excerpt,
      siteName: siteConfig.fullName,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return <BlogPostPageContent post={post} relatedPosts={getRelatedBlogPosts(post)} />;
}
