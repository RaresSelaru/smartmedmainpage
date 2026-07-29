import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import {
  blogCategories,
  defaultBlogCategory,
  getBlogCategory,
  type BlogCategorySlug,
} from "@/lib/blog";
import {
  PUBLIC_BLOG_CACHE_TAG,
  PUBLIC_BLOG_REVALIDATE_SECONDS,
} from "@/lib/content/cache";
import { readStoredContentDocument } from "@/lib/content/legacy";
import { getPublicCmsMediaPath } from "@/lib/content/media";
import {
  contentDocumentToPlainText,
  estimateContentReadTime,
} from "@/lib/content/text";
import type {
  PublicBlogPost,
  PublicBlogSummary,
} from "@/lib/content/types";
import { getPublicServerSupabaseClient } from "@/lib/supabase/public-server";

type UnknownRecord = Record<string, unknown>;

export type PublicContentErrorCode =
  | "configuration"
  | "data-invalid"
  | "unavailable";

export class PublicContentUnavailableError extends Error {
  readonly code: PublicContentErrorCode;

  constructor(code: PublicContentErrorCode) {
    super("Conținutul editorial nu este disponibil momentan.");
    this.name = "PublicContentUnavailableError";
    this.code = code;
  }
}

export function isPublicContentUnavailableError(
  error: unknown,
): error is PublicContentUnavailableError {
  if (error instanceof PublicContentUnavailableError) {
    return true;
  }

  const record = asRecord(error);
  return (
    record?.name === "PublicContentUnavailableError" &&
    (record.code === "configuration" ||
      record.code === "data-invalid" ||
      record.code === "unavailable")
  );
}

const fallbackCoverImage = "/assets/generated/feature-blog.png";
const knownCategorySlugs = new Set<string>(
  blogCategories.map((category) => category.slug),
);
const safeLocalPathPattern = /^\/(?!\/)[^\u0000-\u001f\u007f\\]*$/u;
const safeSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const maximumPublicSummaries = 500;
const publicSummaryBatchSize = 100;

const publicSummarySelect = `
  id,
  kind,
  slug,
  title,
  excerpt,
  published_at,
  seo_title,
  seo_description,
  metadata,
  author:content_authors!content_entries_author_id_fkey (
    display_name
  ),
  cover:media_assets!content_entries_cover_media_id_fkey (
    id,
    storage_bucket,
    storage_path,
    default_alt_text
  ),
  published_revision:content_revisions!content_entries_published_revision_fk (
    created_at
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

const publicDetailSelect = `
  ${publicSummarySelect},
  revision:content_revisions!content_entries_published_revision_fk (
    body,
    schema_version,
    created_at
  )
`;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asRecords(value: unknown): UnknownRecord[] {
  if (Array.isArray(value)) {
    return value
      .map(asRecord)
      .filter((item): item is UnknownRecord => item !== null);
  }

  const record = asRecord(value);
  return record ? [record] : [];
}

function firstRecord(value: unknown): UnknownRecord | null {
  return asRecords(value)[0] ?? null;
}

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function readNullableText(value: unknown, maxLength: number): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return readText(value, maxLength);
}

function readDateTime(value: unknown): string | null {
  const text = readText(value, 64);

  if (!text) {
    return null;
  }

  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function readMetadata(value: unknown): UnknownRecord | null {
  return asRecord(value);
}

function readMetadataText(
  metadata: UnknownRecord | null,
  maxLength: number,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = readText(metadata?.[key], maxLength);

    if (value) {
      return value;
    }
  }

  return null;
}

function readCategory(
  row: UnknownRecord,
  metadata: UnknownRecord | null,
): BlogCategorySlug {
  const categoryRows = asRecords(row.categories).sort(
    (first, second) =>
      Number(Boolean(second.is_primary)) - Number(Boolean(first.is_primary)),
  );
  const candidates = [
    ...categoryRows.map((categoryRow) =>
      readText(firstRecord(categoryRow.category)?.slug, 80),
    ),
    readMetadataText(metadata, 80, "category", "category_slug"),
  ];

  return (
    candidates.find(
      (candidate): candidate is BlogCategorySlug =>
        Boolean(candidate && knownCategorySlugs.has(candidate)),
    ) ?? defaultBlogCategory
  );
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
      return (
        readText(tag?.name, 80) ??
        readText(tag?.label, 80) ??
        readText(tag?.slug, 80)
      );
    })
    .filter((tag): tag is string => Boolean(tag));
}

function readTags(
  row: UnknownRecord,
  metadata: UnknownRecord | null,
  category: BlogCategorySlug,
) {
  const relationTags = asRecords(row.tags)
    .map((tagRow) => {
      const tag = firstRecord(tagRow.tag);
      return readText(tag?.name, 80) ?? readText(tag?.slug, 80);
    })
    .filter((tag): tag is string => Boolean(tag));
  const tags = [...relationTags, ...readMetadataTags(metadata)];

  const uniqueTags = [
    ...new Map(
      tags.map((tag) => [tag.toLocaleLowerCase("ro-RO"), tag]),
    ).values(),
  ];

  return uniqueTags.length
    ? uniqueTags.slice(0, 12)
    : [getBlogCategory(category)?.label ?? "SmartMed"];
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

  return encodedPath
    ? `${projectUrl}/storage/v1/object/public/public-media/${encodedPath}`
    : null;
}

function readCover(
  row: UnknownRecord,
  metadata: UnknownRecord | null,
  projectUrl: string,
) {
  const cover = firstRecord(row.cover);
  const mediaId = readPositiveInteger(cover?.id);
  const storageBucket = readText(cover?.storage_bucket, 100);
  const storagePath = readText(cover?.storage_path, 1_000);
  const metadataCover = readMetadataText(
    metadata,
    1_000,
    "coverImage",
    "cover_image",
  );

  let coverImage: string | null = null;

  if (mediaId && storageBucket === "cms-media") {
    coverImage = getPublicCmsMediaPath(mediaId, 1280);
  } else {
    coverImage = buildPublicStorageUrl(projectUrl, storageBucket, storagePath);
  }

  if (!coverImage && metadataCover && safeLocalPathPattern.test(metadataCover)) {
    coverImage = metadataCover;
  }

  return {
    coverAlt:
      readText(cover?.default_alt_text, 500) ??
      readMetadataText(metadata, 500, "coverAlt", "cover_alt"),
    coverImage: coverImage ?? fallbackCoverImage,
  };
}

function mapSummary(value: unknown, projectUrl: string): PublicBlogSummary | null {
  const row = asRecord(value);

  if (!row) {
    return null;
  }

  if (row.kind !== "article") {
    return null;
  }

  const id = readPositiveInteger(row.id);
  const slug = readText(row.slug, 160);
  const title = readText(row.title, 160);
  const excerpt = readText(row.excerpt, 320);
  const publishedAt = readDateTime(row.published_at);
  const modifiedAt =
    readDateTime(firstRecord(row.published_revision)?.created_at) ??
    publishedAt;

  if (
    !id ||
    !slug ||
    !safeSlugPattern.test(slug) ||
    !title ||
    !excerpt ||
    !publishedAt ||
    !modifiedAt
  ) {
    return null;
  }

  const metadata = readMetadata(row.metadata);
  const category = readCategory(row, metadata);
  const cover = readCover(row, metadata, projectUrl);

  return {
    id,
    slug,
    title,
    excerpt,
    category,
    tags: readTags(row, metadata, category),
    publishedAt,
    modifiedAt,
    coverImage: cover.coverImage,
    coverAlt: cover.coverAlt ?? title,
    readTime:
      readMetadataText(metadata, 40, "readTime", "read_time") ?? "1 min",
    author:
      readText(firstRecord(row.author)?.display_name, 100) ??
      readMetadataText(metadata, 100, "author", "author_name") ??
      "Echipa SmartMed",
    seoTitle: readNullableText(row.seo_title, 70),
    seoDescription: readNullableText(row.seo_description, 180),
  };
}

function safeLogPublicContentFailure(
  stage: string,
  error?: unknown,
  context?: Record<string, string | number | undefined>,
) {
  const record = asRecord(error);

  console.warn("SmartMed public content request failed.", {
    code: readText(record?.code, 80) ?? undefined,
    errorType: error instanceof Error ? error.name : undefined,
    stage,
    ...context,
  });
}

async function loadPublishedBlogSummaries(): Promise<PublicBlogSummary[]> {
  const supabase = getPublicServerSupabaseClient();

  if (!supabase) {
    throw new PublicContentUnavailableError("configuration");
  }

  try {
    const rows: unknown[] = [];
    const publishedBefore = new Date().toISOString();

    for (
      let offset = 0;
      offset < maximumPublicSummaries;
      offset += publicSummaryBatchSize
    ) {
      const { data, error } = await supabase.client
        .from("content_entries")
        .select(publicSummarySelect)
        .eq("kind", "article")
        .eq("status", "published")
        .eq("visibility", "public")
        .lte("published_at", publishedBefore)
        .order("published_at", { ascending: false })
        .order("id", { ascending: false })
        .range(
          offset,
          Math.min(
            offset + publicSummaryBatchSize - 1,
            maximumPublicSummaries - 1,
          ),
        );

      if (error) {
        safeLogPublicContentFailure("summary-query", error);
        throw new PublicContentUnavailableError("unavailable");
      }

      const batch: unknown[] = Array.isArray(data) ? data : [];
      rows.push(...batch);

      if (batch.length < publicSummaryBatchSize) {
        break;
      }
    }

    if (rows.length === maximumPublicSummaries) {
      safeLogPublicContentFailure("summary-cap-reached", undefined, {
        rowCount: rows.length,
      });
    }

    const summaries = rows
      .map((row) => mapSummary(row, supabase.projectUrl))
      .filter((summary): summary is PublicBlogSummary => summary !== null);

    if (summaries.length !== rows.length) {
      safeLogPublicContentFailure("summary-row-skipped", undefined, {
        rowCount: rows.length,
        skippedCount: rows.length - summaries.length,
      });
    }

    if (rows.length && !summaries.length) {
      safeLogPublicContentFailure("summary-mapping", undefined, {
        rowCount: rows.length,
      });
      throw new PublicContentUnavailableError("data-invalid");
    }

    return [
      ...new Map(
        summaries.map((summary) => [summary.slug, summary]),
      ).values(),
    ].sort((first, second) =>
      second.publishedAt.localeCompare(first.publishedAt),
    );
  } catch (error) {
    if (isPublicContentUnavailableError(error)) {
      throw error;
    }

    safeLogPublicContentFailure("summary-request", error);
    throw new PublicContentUnavailableError("unavailable");
  }
}

const getCachedPublishedBlogSummaries = unstable_cache(
  loadPublishedBlogSummaries,
  ["smartmed-public-blog-summaries"],
  {
    revalidate: PUBLIC_BLOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_BLOG_CACHE_TAG],
  },
);

function requirePublicCmsConfiguration() {
  if (!getPublicServerSupabaseClient()) {
    throw new PublicContentUnavailableError("configuration");
  }
}

export const getPublishedBlogSummaries = cache(async () => {
  requirePublicCmsConfiguration();
  return getCachedPublishedBlogSummaries();
});

async function loadPublishedBlogPostBySlug(
  slug: string,
): Promise<PublicBlogPost | null> {
  const supabase = getPublicServerSupabaseClient();

  if (!supabase) {
    throw new PublicContentUnavailableError("configuration");
  }

  try {
    const { data, error } = await supabase.client
      .from("content_entries")
      .select(publicDetailSelect)
      .eq("kind", "article")
      .eq("status", "published")
      .eq("visibility", "public")
      .lte("published_at", new Date().toISOString())
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      safeLogPublicContentFailure("detail-query", error);
      throw new PublicContentUnavailableError("unavailable");
    }

    if (!data) {
      return null;
    }

    const row = asRecord(data);
    const summary = mapSummary(row, supabase.projectUrl);
    const revision = firstRecord(row?.revision);

    if (!row || !summary || !revision) {
      safeLogPublicContentFailure("detail-mapping", undefined, { slug });
      throw new PublicContentUnavailableError("data-invalid");
    }

    const schemaVersion =
      typeof revision.schema_version === "number"
        ? revision.schema_version
        : null;
    const readResult = readStoredContentDocument(
      revision.body,
      schemaVersion,
    );

    if (readResult.issues.length) {
      safeLogPublicContentFailure("detail-block-mapping", undefined, {
        issueCount: readResult.issues.length,
        slug,
      });
    }

    const metadata = readMetadata(row.metadata);
    const plainText = contentDocumentToPlainText(readResult.document);
    const revisionCreatedAt = readDateTime(revision.created_at);

    return {
      ...summary,
      modifiedAt: revisionCreatedAt ?? summary.modifiedAt,
      document: readResult.document,
      contentPreview: plainText.slice(0, 320) || summary.excerpt,
      readTime:
        readMetadataText(metadata, 40, "readTime", "read_time") ??
        estimateContentReadTime(readResult.document),
      disclaimer: readNullableText(metadata?.disclaimer, 500),
      correctionNote: readNullableText(
        metadata?.correctionNote ?? metadata?.correction_note,
        500,
      ),
      reviewer: readNullableText(metadata?.reviewer, 500),
      reviewedAt: readDateTime(
        metadata?.reviewDate ??
          metadata?.reviewedAt ??
          metadata?.reviewed_at,
      ),
    };
  } catch (error) {
    if (isPublicContentUnavailableError(error)) {
      throw error;
    }

    safeLogPublicContentFailure("detail-request", error, { slug });
    throw new PublicContentUnavailableError("unavailable");
  }
}

const getCachedPublishedBlogPostBySlug = unstable_cache(
  loadPublishedBlogPostBySlug,
  ["smartmed-public-blog-detail"],
  {
    revalidate: PUBLIC_BLOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_BLOG_CACHE_TAG],
  },
);

export const getPublishedBlogPostBySlug = cache(async (slug: string) => {
  const normalized = slug.trim();

  if (!safeSlugPattern.test(normalized) || normalized.length > 160) {
    return null;
  }

  requirePublicCmsConfiguration();
  return getCachedPublishedBlogPostBySlug(normalized);
});

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("ro-RO");
}

export type PublishedBlogPage = {
  items: PublicBlogSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export async function getPublishedBlogPage({
  category,
  page = 1,
  pageSize = 18,
  query,
}: {
  category?: BlogCategorySlug;
  page?: number;
  pageSize?: number;
  query?: string;
} = {}): Promise<PublishedBlogPage> {
  const safePage = Number.isSafeInteger(page) && page > 0 ? page : 1;
  const safePageSize =
    Number.isSafeInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, 60)
      : 18;
  const terms = normalizeSearchText((query ?? "").slice(0, 160))
    .split(/\s+/u)
    .filter(Boolean);
  const summaries = (await getPublishedBlogSummaries()).filter((summary) => {
    if (category && summary.category !== category) {
      return false;
    }

    if (!terms.length) {
      return true;
    }

    const haystack = normalizeSearchText(
      [
        summary.title,
        summary.excerpt,
        summary.category,
        summary.author,
        summary.tags.join(" "),
      ].join(" "),
    );

    return terms.every((term) => haystack.includes(term));
  });
  const total = summaries.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const boundedPage = Math.min(safePage, totalPages);
  const start = (boundedPage - 1) * safePageSize;

  return {
    items: summaries.slice(start, start + safePageSize),
    page: boundedPage,
    pageSize: safePageSize,
    total,
    totalPages,
  };
}

export async function getRelatedPublishedBlogPosts(
  post: PublicBlogPost,
  limit = 3,
) {
  requirePublicCmsConfiguration();

  const safeLimit = Number.isSafeInteger(limit)
    ? Math.max(0, Math.min(limit, 12))
    : 3;

  if (safeLimit === 0) {
    return [];
  }

  const explicitRelations = await getCachedRelatedPublishedBlogPosts(
    post.id,
    safeLimit,
  );

  if (explicitRelations.length) {
    return explicitRelations;
  }

  const postTags = new Set(
    post.tags.map((tag) => tag.toLocaleLowerCase("ro-RO")),
  );

  return (await getPublishedBlogSummaries())
    .filter((candidate) => candidate.slug !== post.slug)
    .sort((first, second) => {
      const firstScore =
        Number(first.category === post.category) * 10 +
        first.tags.filter((tag) =>
          postTags.has(tag.toLocaleLowerCase("ro-RO")),
        ).length;
      const secondScore =
        Number(second.category === post.category) * 10 +
        second.tags.filter((tag) =>
          postTags.has(tag.toLocaleLowerCase("ro-RO")),
        ).length;

      return (
        secondScore - firstScore ||
        second.publishedAt.localeCompare(first.publishedAt)
      );
    })
    .slice(0, safeLimit);
}

async function loadRelatedPublishedBlogPosts(
  entryId: number,
  limit: number,
): Promise<PublicBlogSummary[]> {
  const supabase = getPublicServerSupabaseClient();

  if (!supabase) {
    throw new PublicContentUnavailableError("configuration");
  }

  try {
    const { data, error } = await supabase.client
      .from("content_relations")
      .select(`
        sort_order,
        related:content_entries!content_relations_related_content_entry_id_fkey (
          ${publicSummarySelect}
        )
      `)
      .eq("content_entry_id", entryId)
      .eq("relation_type", "related")
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error) {
      safeLogPublicContentFailure("related-query", error, { entryId });
      throw new PublicContentUnavailableError("unavailable");
    }

    const rows: unknown[] = Array.isArray(data) ? data : [];
    return rows
      .map((value) => {
        const row = asRecord(value);
        return mapSummary(
          firstRecord(row?.related),
          supabase.projectUrl,
        );
      })
      .filter((summary): summary is PublicBlogSummary => summary !== null)
      .filter((summary) => summary.id !== entryId)
      .slice(0, limit);
  } catch (error) {
    if (isPublicContentUnavailableError(error)) {
      throw error;
    }

    safeLogPublicContentFailure("related-request", error, { entryId });
    throw new PublicContentUnavailableError("unavailable");
  }
}

const getCachedRelatedPublishedBlogPosts = unstable_cache(
  loadRelatedPublishedBlogPosts,
  ["smartmed-public-blog-related"],
  {
    revalidate: PUBLIC_BLOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_BLOG_CACHE_TAG],
  },
);
