import "server-only";

import { cache } from "react";

import {
  blogCategories,
  defaultBlogCategory,
  getBlogCategory,
  getBlogPosts as getFallbackBlogPosts,
  type BlogBodyBlock,
  type BlogCategorySlug,
  type BlogPost,
} from "@/lib/blog";
import { getPublicServerSupabaseClient } from "@/lib/supabase/public-server";

type UnknownRecord = Record<string, unknown>;

const fallbackCoverImage = "/assets/generated/feature-blog.png";
const knownCategorySlugs = new Set<string>(blogCategories.map((category) => category.slug));
const safeLocalPathPattern = /^\/(?!\/)[^\u0000-\u001f\u007f\\]*$/;
const safeSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const cmsBlogSelect = `
  id,
  slug,
  title,
  excerpt,
  published_at,
  metadata,
  author:content_authors!content_entries_author_id_fkey (
    display_name
  ),
  cover:media_assets!content_entries_cover_media_id_fkey (
    storage_bucket,
    storage_path,
    default_alt_text
  ),
  revision:content_revisions!content_entries_published_revision_fk (
    body
  ),
  categories:content_entry_categories (
    is_primary,
    category:content_categories (
      name,
      slug
    )
  ),
  tags:content_entry_tags (
    tag:content_tags (
      name,
      slug
    )
  )
`;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asRecords(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value.map(asRecord).filter((item): item is UnknownRecord => item !== null);
  }

  const record = asRecord(value);
  return record ? [record] : [];
}

function firstRecord(value: unknown): UnknownRecord | null {
  return asRecords(value)[0] ?? null;
}

function readText(value: unknown, maxLength = 10_000): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  return text.slice(0, maxLength);
}

function readNestedText(record: UnknownRecord | null, ...keys: string[]) {
  for (const key of keys) {
    const value = readText(record?.[key]);

    if (value) {
      return value;
    }
  }

  return null;
}

function readMetadataText(metadata: UnknownRecord | null, ...keys: string[]) {
  return readNestedText(metadata, ...keys);
}

function readDate(value: unknown): string | null {
  const text = readText(value, 64);

  if (!text) {
    return null;
  }

  const timestamp = Date.parse(text);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function readBodyText(record: UnknownRecord) {
  const directText = readText(record.text, 20_000) ?? readText(record.content, 20_000);

  if (directText) {
    return directText;
  }

  const data = asRecord(record.data);
  return readText(data?.text, 20_000) ?? readText(data?.content, 20_000);
}

function readListItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return readText(item, 2_000);
      }

      const itemRecord = asRecord(item);
      return readText(itemRecord?.content, 2_000) ?? readText(itemRecord?.text, 2_000);
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 50);
}

function mapBody(value: unknown): BlogBodyBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((candidate): BlogBodyBlock | null => {
      const block = asRecord(candidate);
      const type = readText(block?.type, 32)?.toLocaleLowerCase("ro-RO");

      if (!block || !type) {
        return null;
      }

      if (type === "paragraph") {
        const text = readBodyText(block);
        return text ? { text, type: "paragraph" } : null;
      }

      if (type === "heading" || type === "header") {
        const text = readBodyText(block);
        return text ? { text, type: "heading" } : null;
      }

      if (type === "list") {
        const data = asRecord(block.data);
        const items = readListItems(block.items ?? data?.items);
        return items.length ? { items, type: "list" } : null;
      }

      return null;
    })
    .filter((block): block is BlogBodyBlock => block !== null)
    .slice(0, 150);
}

function mapCategory(row: UnknownRecord, metadata: UnknownRecord | null): BlogCategorySlug {
  const categoryRows = asRecords(row.categories).sort(
    (first, second) => Number(Boolean(second.is_primary)) - Number(Boolean(first.is_primary)),
  );

  const candidates = [
    ...categoryRows.map((categoryRow) => readText(firstRecord(categoryRow.category)?.slug, 80)),
    readMetadataText(metadata, "category", "category_slug"),
  ];

  const category = candidates.find(
    (candidate): candidate is BlogCategorySlug =>
      Boolean(candidate && knownCategorySlugs.has(candidate)),
  );

  return category ?? defaultBlogCategory;
}

function readMetadataTags(metadata: UnknownRecord | null): string[] {
  const value = metadata?.tags;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((candidate) => {
      if (typeof candidate === "string") {
        return readText(candidate, 80);
      }

      const tag = asRecord(candidate);
      return readText(tag?.name, 80) ?? readText(tag?.label, 80) ?? readText(tag?.slug, 80);
    })
    .filter((tag): tag is string => Boolean(tag));
}

function mapTags(
  row: UnknownRecord,
  metadata: UnknownRecord | null,
  category: BlogCategorySlug,
): string[] {
  const relationTags = asRecords(row.tags)
    .map((tagRow) => {
      const tag = firstRecord(tagRow.tag);
      return readText(tag?.name, 80) ?? readText(tag?.slug, 80);
    })
    .filter((tag): tag is string => Boolean(tag));
  const tags = [...relationTags, ...readMetadataTags(metadata)];
  const uniqueTags = [...new Map(tags.map((tag) => [tag.toLocaleLowerCase("ro-RO"), tag])).values()];

  if (uniqueTags.length) {
    return uniqueTags.slice(0, 12);
  }

  return [getBlogCategory(category)?.label ?? "SmartMed"];
}

function readSafeLocalCover(metadata: UnknownRecord | null) {
  const cover = readMetadataText(metadata, "coverImage", "cover_image");
  return cover && safeLocalPathPattern.test(cover) ? cover : null;
}

function buildPublicStorageUrl(
  projectUrl: string,
  storageBucket: string | null,
  storagePath: string | null,
) {
  if (storageBucket !== "public-media" || !storagePath) {
    return null;
  }

  const encodedPath = storagePath
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  if (!encodedPath) {
    return null;
  }

  return `${projectUrl}/storage/v1/object/public/public-media/${encodedPath}`;
}

function estimateReadTime(body: BlogBodyBlock[]) {
  const wordCount = body.reduce((total, block) => {
    const text = block.type === "list" ? block.items.join(" ") : block.text;
    return total + text.split(/\s+/u).filter(Boolean).length;
  }, 0);

  return `${Math.max(1, Math.ceil(wordCount / 200))} min`;
}

function mapCmsPost(value: unknown, projectUrl: string): BlogPost | null {
  const row = asRecord(value);

  if (!row) {
    return null;
  }

  const metadata = asRecord(row.metadata);
  const idValue =
    readMetadataText(metadata, "id") ??
    (typeof row.id === "number" && Number.isSafeInteger(row.id)
      ? String(row.id)
      : readText(row.id, 100));
  const slug = readText(row.slug, 240);
  const title = readText(row.title, 220);
  const date = readDate(metadata?.date) ?? readDate(row.published_at);

  if (!idValue || !slug || !safeSlugPattern.test(slug) || !title || !date) {
    return null;
  }

  const revision = firstRecord(row.revision);
  const body = mapBody(revision?.body);
  const firstBodyText = body.find(
    (block): block is Extract<BlogBodyBlock, { type: "paragraph" }> =>
      block.type === "paragraph",
  )?.text;
  const excerpt =
    readText(row.excerpt, 1_000) ??
    readMetadataText(metadata, "excerpt", "summary") ??
    readText(firstBodyText, 1_000) ??
    title;
  const contentPreview =
    readMetadataText(metadata, "contentPreview", "content_preview") ??
    readText(firstBodyText, 1_000) ??
    excerpt;
  const safeBody: BlogBodyBlock[] = body.length
    ? body
    : [{ text: contentPreview, type: "paragraph" }];
  const category = mapCategory(row, metadata);
  const author =
    readText(firstRecord(row.author)?.display_name, 100) ??
    readMetadataText(metadata, "author", "author_name") ??
    "Echipa SmartMed";
  const cover = firstRecord(row.cover);
  const storageCover = buildPublicStorageUrl(
    projectUrl,
    readText(cover?.storage_bucket, 100),
    readText(cover?.storage_path, 1_000),
  );
  const readTime =
    readMetadataText(metadata, "readTime", "read_time") ??
    (typeof metadata?.read_time_minutes === "number" &&
    Number.isFinite(metadata.read_time_minutes) &&
    metadata.read_time_minutes > 0
      ? `${Math.ceil(metadata.read_time_minutes)} min`
      : estimateReadTime(safeBody));

  return {
    author,
    body: safeBody,
    category,
    contentPreview,
    coverAlt:
      readText(cover?.default_alt_text, 500) ??
      readMetadataText(metadata, "coverAlt", "cover_alt") ??
      title,
    coverImage: storageCover ?? readSafeLocalCover(metadata) ?? fallbackCoverImage,
    date,
    excerpt,
    id: idValue,
    readTime: readText(readTime, 40) ?? estimateReadTime(safeBody),
    slug,
    tags: mapTags(row, metadata, category),
    title,
  };
}

function safeLogCmsFailure(stage: string, error: unknown) {
  const errorRecord = asRecord(error);

  console.warn("SmartMed blog CMS unavailable; using bundled fallback.", {
    code: readText(errorRecord?.code, 80) ?? undefined,
    errorType: error instanceof Error ? error.name : "UnknownError",
    stage,
  });
}

async function loadPublishedBlogPosts(): Promise<BlogPost[]> {
  const supabase = getPublicServerSupabaseClient();

  if (!supabase) {
    return getFallbackBlogPosts();
  }

  try {
    const { data, error } = await supabase.client
      .from("content_entries")
      .select(cmsBlogSelect)
      .eq("kind", "article")
      .eq("status", "published")
      .eq("visibility", "public")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false });

    if (error) {
      safeLogCmsFailure("query", error);
      return getFallbackBlogPosts();
    }

    const rows: unknown[] = Array.isArray(data) ? data : [];
    const posts = rows
      .map((row) => mapCmsPost(row, supabase.projectUrl))
      .filter((post): post is BlogPost => post !== null);

    if (rows.length && !posts.length) {
      safeLogCmsFailure("mapping", { code: "no-valid-cms-rows" });
    }

    return [...new Map(posts.map((post) => [post.slug, post])).values()].sort((first, second) =>
      second.date.localeCompare(first.date),
    );
  } catch (error) {
    safeLogCmsFailure("request", error);
    return getFallbackBlogPosts();
  }
}

export const getPublishedBlogPosts = cache(loadPublishedBlogPosts);

export const getPublishedBlogPostBySlug = cache(async (slug: string) => {
  const safeSlug = readText(slug, 240);

  if (!safeSlug || !safeSlugPattern.test(safeSlug)) {
    return undefined;
  }

  return (await getPublishedBlogPosts()).find((post) => post.slug === safeSlug);
});

export async function getPublishedBlogPostsByCategory(category: BlogCategorySlug) {
  return (await getPublishedBlogPosts()).filter((post) => post.category === category);
}

export async function searchPublishedBlogPosts(query: string) {
  const normalized = query.trim().toLocaleLowerCase("ro-RO");
  const posts = await getPublishedBlogPosts();

  if (!normalized) {
    return posts.filter((post) => post.category === defaultBlogCategory);
  }

  return posts.filter((post) => {
    const haystack = [
      post.title,
      post.excerpt,
      post.category,
      post.tags.join(" "),
      post.contentPreview,
    ]
      .join(" ")
      .toLocaleLowerCase("ro-RO");

    return haystack.includes(normalized);
  });
}

export async function getRelatedPublishedBlogPosts(post: BlogPost, limit = 3) {
  return (await getPublishedBlogPosts())
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((first, second) => {
      const firstScore = first.category === post.category ? 0 : 1;
      const secondScore = second.category === post.category ? 0 : 1;

      return firstScore - secondScore || second.date.localeCompare(first.date);
    })
    .slice(0, Math.max(0, limit));
}
