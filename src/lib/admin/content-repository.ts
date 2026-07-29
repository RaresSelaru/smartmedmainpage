import "server-only";

import { z } from "zod";

import type { Json } from "@/lib/auth/database.types";
import { createServerSupabaseClient } from "@/lib/auth/supabase";
import {
  adminContentStatuses,
  type AdminContentListFilters,
} from "@/lib/admin/content-filters";
import type {
  AdminContentDetail,
  AdminContentListPage,
  AdminContentRevision,
  AdminRevisionPreview,
  CmsMutationReceipt,
} from "@/lib/admin/content-types";
import {
  contentDocumentSchema,
  editorialSnapshotSchema,
} from "@/lib/content/schema";
import { readStoredContentDocument } from "@/lib/content/legacy";

type CmsRpcErrorShape = {
  code: string;
  details: string | null;
  hint: string | null;
  message: string;
};

type CmsRpcClient = {
  rpc(
    functionName: string,
    args?: Record<string, Json | undefined>,
  ): Promise<{
    data: unknown;
    error: CmsRpcErrorShape | null;
  }>;
};

const contentKindSchema = z.enum(["blog", "news"]);
const contentStatusSchema = z.enum(adminContentStatuses);
const nullablePositiveIdSchema = z.number().int().positive().nullable();
const dateTimeSchema = z.string().min(1).max(64);

const listItemSchema = z.object({
  authorId: nullablePositiveIdSchema,
  channelPublic: z.boolean(),
  hasUnpublishedChanges: z.boolean(),
  id: z.number().int().positive(),
  kind: contentKindSchema,
  publishedAt: dateTimeSchema.nullable(),
  publishedRevisionId: nullablePositiveIdSchema,
  slug: z.string().min(1).max(160),
  status: contentStatusSchema,
  title: z.string().min(1).max(160),
  updatedAt: dateTimeSchema,
  visibility: z.string().min(1).max(32),
  workingRevisionId: nullablePositiveIdSchema,
  workingRevisionNo: z.number().int().positive().nullable(),
});

const listPageSchema = z.object({
  items: z.array(listItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  total: z.number().int().nonnegative(),
});

const rawRevisionSchema = z.object({
  body: z.unknown(),
  changeSummary: z.string().max(500).nullable(),
  createdAt: dateTimeSchema,
  createdBy: z.uuid().nullable(),
  id: z.number().int().positive(),
  revisionNo: z.number().int().positive(),
  schemaVersion: z.number().int().min(0).max(1),
  snapshot: editorialSnapshotSchema,
});

const historyItemSchema = z.object({
  changeSummary: z.string().max(500).nullable(),
  createdAt: dateTimeSchema,
  createdBy: z.uuid().nullable(),
  id: z.number().int().positive(),
  isPublished: z.boolean(),
  isWorking: z.boolean(),
  revisionNo: z.number().int().positive(),
  schemaVersion: z.number().int().min(0).max(1),
});

const detailSchema = z.object({
  entry: z.object({
    channelPublic: z.boolean(),
    createdAt: dateTimeSchema,
    id: z.number().int().positive(),
    kind: contentKindSchema,
    publishedAt: dateTimeSchema.nullable(),
    publishedRevisionId: nullablePositiveIdSchema,
    status: contentStatusSchema,
    updatedAt: dateTimeSchema,
    visibility: z.string().min(1).max(32),
    workingRevisionId: nullablePositiveIdSchema,
  }),
  history: z.array(historyItemSchema),
  publishedRevision: rawRevisionSchema.nullable(),
  workingRevision: rawRevisionSchema,
});

const previewSchema = z.object({
  entryId: z.number().int().positive(),
  kind: contentKindSchema,
  revision: rawRevisionSchema.extend({
    isPublished: z.boolean(),
    isWorking: z.boolean(),
  }),
  status: contentStatusSchema,
});

export const cmsMutationReceiptSchema = z.object({
  changed: z.boolean(),
  entryId: z.number().int().positive(),
  newSlug: z.string().min(1).max(160).nullable(),
  oldSlug: z.string().min(1).max(160).nullable(),
  revisionId: nullablePositiveIdSchema,
  workingRevisionId: nullablePositiveIdSchema,
});

export class AdminContentRepositoryError extends Error {
  constructor(
    public readonly code:
      | "configuration"
      | "data-invalid"
      | "not-found"
      | "rpc",
    public readonly rpcError: CmsRpcErrorShape | null = null,
  ) {
    super("Conținutul administrativ nu este disponibil momentan.");
    this.name = "AdminContentRepositoryError";
  }
}

function normalizeRevision(
  revision: z.infer<typeof rawRevisionSchema>,
): AdminContentRevision {
  const readResult = readStoredContentDocument(
    revision.body,
    revision.schemaVersion,
  );

  return {
    ...revision,
    body: contentDocumentSchema.parse(readResult.document),
  };
}

async function getCmsRpcClient(): Promise<CmsRpcClient> {
  const supabase = await createServerSupabaseClient({
    requireCookieWrites: true,
  });

  if (!supabase) {
    throw new AdminContentRepositoryError("configuration");
  }

  return supabase as unknown as CmsRpcClient;
}

export async function executeCmsRpc(
  functionName: string,
  args: Record<string, Json | undefined>,
) {
  const client = await getCmsRpcClient();
  const { data, error } = await client.rpc(functionName, args);

  if (error) {
    throw new AdminContentRepositoryError(
      error.code === "P0002" ? "not-found" : "rpc",
      error,
    );
  }

  return data;
}

export async function getAdminContentList(
  filters: AdminContentListFilters,
): Promise<AdminContentListPage> {
  const data = await executeCmsRpc("cms_list_content", {
    p_author_id: filters.authorId,
    p_category_id: filters.categoryId,
    p_kind: filters.kind,
    p_page: filters.page,
    p_page_size: 20,
    p_status: filters.status,
  });
  const parsed = listPageSchema.safeParse(data);

  if (!parsed.success) {
    throw new AdminContentRepositoryError("data-invalid");
  }

  return parsed.data;
}

export async function getAdminContentDetail(
  entryId: number,
): Promise<AdminContentDetail> {
  const data = await executeCmsRpc("cms_get_content", {
    p_entry_id: entryId,
  });
  const parsed = detailSchema.safeParse(data);

  if (!parsed.success) {
    throw new AdminContentRepositoryError("data-invalid");
  }

  return {
    ...parsed.data,
    publishedRevision: parsed.data.publishedRevision
      ? normalizeRevision(parsed.data.publishedRevision)
      : null,
    workingRevision: normalizeRevision(parsed.data.workingRevision),
  };
}

export async function getAdminRevisionPreview(
  entryId: number,
  revisionId: number,
): Promise<AdminRevisionPreview> {
  const data = await executeCmsRpc("cms_get_revision", {
    p_entry_id: entryId,
    p_revision_id: revisionId,
  });
  const parsed = previewSchema.safeParse(data);

  if (!parsed.success) {
    throw new AdminContentRepositoryError("data-invalid");
  }

  const { isPublished, isWorking, ...revision } = parsed.data.revision;

  return {
    entryId: parsed.data.entryId,
    isPublished,
    isWorking,
    kind: parsed.data.kind,
    revision: normalizeRevision(revision),
    status: parsed.data.status,
  };
}

export function parseCmsMutationReceipt(value: unknown): CmsMutationReceipt {
  return cmsMutationReceiptSchema.parse(value);
}
