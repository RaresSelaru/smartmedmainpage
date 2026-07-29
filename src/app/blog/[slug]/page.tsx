import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogPostPageContent } from "@/components/blog/blog-post-page";
import {
  getPublishedBlogPostBySlug,
  getRelatedPublishedBlogPosts,
  isPublicContentUnavailableError,
} from "@/lib/blog-repository";
import { absoluteSiteUrl, serializeJsonLd } from "@/lib/content/seo";
import { siteConfig } from "@/lib/site-config";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const canonicalUrl = absoluteSiteUrl(siteConfig.url, `/blog/${post.slug}`);
  const imageUrl = absoluteSiteUrl(siteConfig.url, post.coverImage);
  const metadataTitle = post.seoTitle ?? post.title;
  const metadataDescription = post.seoDescription ?? post.excerpt;

  return {
    title: metadataTitle,
    description: metadataDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${metadataTitle} | ${siteConfig.name}`,
      description: metadataDescription,
      siteName: siteConfig.fullName,
      type: "article",
      url: canonicalUrl,
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
      images: [
        {
          url: imageUrl,
          alt: post.coverAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: metadataTitle,
      description: metadataDescription,
      images: [imageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPublishedBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const canonicalUrl = absoluteSiteUrl(siteConfig.url, `/blog/${post.slug}`);
  const imageUrl = absoluteSiteUrl(siteConfig.url, post.coverImage);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": post.reviewer ? "MedicalWebPage" : "Article",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    image: [imageUrl],
    datePublished: post.publishedAt,
    dateModified: post.modifiedAt,
    mainEntityOfPage: canonicalUrl,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.fullName,
      url: siteConfig.url,
    },
    ...(post.reviewer
      ? {
          reviewedBy: {
            "@type": "Person",
            name: post.reviewer,
          },
          lastReviewed: post.reviewedAt ?? post.modifiedAt,
        }
      : {}),
  };
  let relatedPosts: Awaited<
    ReturnType<typeof getRelatedPublishedBlogPosts>
  > = [];

  try {
    relatedPosts = await getRelatedPublishedBlogPosts(post);
  } catch (error) {
    if (!isPublicContentUnavailableError(error)) {
      throw error;
    }

    console.warn("SmartMed omitted related Blog articles.", {
      code: error.code,
      entryId: post.id,
    });
  }

  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(jsonLd)}</script>
      <BlogPostPageContent
        post={post}
        relatedPosts={relatedPosts}
      />
    </>
  );
}
