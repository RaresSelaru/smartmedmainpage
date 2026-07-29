import { z } from "zod";

import type { ContentKind } from "@/lib/content/types";

export const adminContentStatuses = [
  "draft",
  "review",
  "published",
  "archived",
] as const;

export type AdminContentStatus = (typeof adminContentStatuses)[number];

export type AdminContentListFilters = {
  authorId: number | null;
  categoryId: number | null;
  kind: ContentKind | null;
  page: number;
  status: AdminContentStatus | null;
};

const positiveIntegerString = z.coerce.number().int().positive();
const pageSchema = z.coerce.number().int().positive().max(10_000).catch(1);

function firstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOptionalPositiveInteger(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = positiveIntegerString.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseAdminContentListFilters(
  searchParams: Record<string, string | string[] | undefined>,
): AdminContentListFilters {
  const kindValue = firstSearchValue(searchParams.kind);
  const statusValue = firstSearchValue(searchParams.status);
  const parsedPage = pageSchema.parse(firstSearchValue(searchParams.page) ?? 1);

  return {
    authorId: parseOptionalPositiveInteger(
      firstSearchValue(searchParams.author),
    ),
    categoryId: parseOptionalPositiveInteger(
      firstSearchValue(searchParams.category),
    ),
    kind:
      kindValue === "blog" || kindValue === "news" ? kindValue : null,
    page: parsedPage,
    status: adminContentStatuses.includes(
      statusValue as AdminContentStatus,
    )
      ? (statusValue as AdminContentStatus)
      : null,
  };
}

export function buildAdminContentListHref(
  filters: AdminContentListFilters,
  overrides: Partial<AdminContentListFilters> = {},
) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();

  if (next.kind) {
    params.set("kind", next.kind);
  }
  if (next.status) {
    params.set("status", next.status);
  }
  if (next.categoryId) {
    params.set("category", String(next.categoryId));
  }
  if (next.authorId) {
    params.set("author", String(next.authorId));
  }
  if (next.page > 1) {
    params.set("page", String(next.page));
  }

  const query = params.toString();
  return query ? `/admin/content?${query}` : "/admin/content";
}
