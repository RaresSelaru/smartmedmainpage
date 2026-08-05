import type { MetadataRoute } from "next";

import {
  getPublishedBlogPosts,
  isPublicContentUnavailableError,
} from "@/lib/blog-repository";
import { absoluteSiteUrl } from "@/lib/content/seo";
import { siteConfig } from "@/lib/site-config";

const staticRoutes = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/centru-fizic", changeFrequency: "monthly", priority: 0.9 },
  { path: "/centru-online", changeFrequency: "monthly", priority: 0.9 },
  { path: "/grile", changeFrequency: "monthly", priority: 0.9 },
  { path: "/simulari-smart", changeFrequency: "weekly", priority: 0.9 },
  { path: "/module-speciale", changeFrequency: "monthly", priority: 0.8 },
  {
    path: "/module-speciale/lectiile-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/module-speciale/sutura-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/module-speciale/radiografia-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/module-speciale/disectia-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/module-speciale/diferentialul-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/module-speciale/imagistica-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/module-speciale/laboratorul-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/module-speciale/problema-smart",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  { path: "/blog", changeFrequency: "daily", priority: 0.8 },
  { path: "/news", changeFrequency: "weekly", priority: 0.7 },
  { path: "/shop", changeFrequency: "weekly", priority: 0.7 },
  { path: "/pentru-parinti", changeFrequency: "monthly", priority: 0.7 },
  { path: "/despre", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/evaluare", changeFrequency: "weekly", priority: 0.95 },
  { path: "/inscriere", changeFrequency: "weekly", priority: 0.9 },
  { path: "/inscriere/centru", changeFrequency: "monthly", priority: 0.85 },
  { path: "/ajutor", changeFrequency: "monthly", priority: 0.5 },
  { path: "/termeni", changeFrequency: "yearly", priority: 0.3 },
  { path: "/confidentialitate", changeFrequency: "yearly", priority: 0.3 },
  { path: "/politica-cookie", changeFrequency: "yearly", priority: 0.3 },
] as const satisfies ReadonlyArray<{
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
}>;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: absoluteSiteUrl(siteConfig.url, route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const posts = await getPublishedBlogPosts();
    const blogEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: absoluteSiteUrl(siteConfig.url, `/blog/${post.slug}`),
      lastModified: post.modifiedAt,
      changeFrequency: "monthly",
      priority: 0.7,
      images: [absoluteSiteUrl(siteConfig.url, post.coverImage)],
    }));

    return [...staticEntries, ...blogEntries];
  } catch (error) {
    if (!isPublicContentUnavailableError(error)) {
      throw error;
    }

    console.warn("SmartMed sitemap omitted CMS Blog entries.", {
      code: error.code,
    });
    return staticEntries;
  }
}
