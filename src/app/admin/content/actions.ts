"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  AdminActionErrorCode,
  AdminActionResult,
} from "@/lib/admin/action-result";
import { authorizeAdminCapability } from "@/lib/admin/auth";
import {
  AdminContentRepositoryError,
  executeCmsRpc,
  getAdminContentDetail,
  parseCmsMutationReceipt,
} from "@/lib/admin/content-repository";
import type { CmsMutationReceipt } from "@/lib/admin/content-types";
import { invalidatePublicBlogCache } from "@/lib/content/cache";
import {
  contentDocumentSchema,
  editorialSnapshotSchema,
} from "@/lib/content/schema";
import type { Json } from "@/lib/auth/database.types";

const contentKindSchema = z.enum(["blog", "news"]);
const changeSummarySchema = z.string().trim().max(500).nullable().optional();
const positiveIdSchema = z.number().int().positive();

const createContentInputSchema = z.object({
  changeSummary: changeSummarySchema,
  document: contentDocumentSchema,
  kind: contentKindSchema,
  snapshot: editorialSnapshotSchema,
});

const saveContentInputSchema = z.object({
  changeSummary: changeSummarySchema,
  document: contentDocumentSchema,
  entryId: positiveIdSchema,
  expectedWorkingRevisionId: positiveIdSchema,
  snapshot: editorialSnapshotSchema,
});

const publishContentInputSchema = z.object({
  entryId: positiveIdSchema,
  expectedWorkingRevisionId: positiveIdSchema,
});

const entryLifecycleInputSchema = z.object({
  entryId: positiveIdSchema,
});

export type CreateContentInput = z.input<typeof createContentInputSchema>;
export type SaveContentInput = z.input<typeof saveContentInputSchema>;
export type PublishContentInput = z.input<typeof publishContentInputSchema>;
export type EntryLifecycleInput = z.input<typeof entryLifecycleInputSchema>;

function fieldErrorsFromZod(error: z.ZodError) {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path
      .map((segment) => String(segment))
      .join(".");
    const field = path || "form";
    fieldErrors[field] ??= [];
    fieldErrors[field].push(issue.message);
  }

  return fieldErrors;
}

function actionError<T>(
  code: AdminActionErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>,
): AdminActionResult<T> {
  return {
    code,
    fieldErrors,
    message,
    ok: false,
  };
}

function mapAuthorizationFailure<T>(
  code:
    | "configuration"
    | "email-unconfirmed"
    | "forbidden"
    | "mfa-required"
    | "unauthenticated"
    | "unavailable",
): AdminActionResult<T> {
  if (code === "unauthenticated") {
    return actionError(
      "unauthenticated",
      "Sesiunea a expirat. Autentifică-te din nou.",
    );
  }

  if (code === "configuration" || code === "unavailable") {
    return actionError(
      "configuration",
      "Serviciul administrativ nu este disponibil momentan.",
    );
  }

  return actionError(
    "forbidden",
    code === "mfa-required"
      ? "Confirmă codul MFA înainte să continui."
      : "Contul nu are drepturile necesare pentru această acțiune.",
  );
}

function mapRepositoryFailure<T>(
  error: AdminContentRepositoryError,
): AdminActionResult<T> {
  const rpcCode = error.rpcError?.code;

  if (error.code === "not-found" || rpcCode === "P0002") {
    return actionError("not-found", "Conținutul solicitat nu mai există.");
  }

  if (rpcCode === "40001") {
    return actionError(
      "conflict",
      "O altă sesiune a salvat o versiune nouă. Reîncarcă pagina înainte să salvezi din nou.",
    );
  }

  if (rpcCode === "23505") {
    return actionError(
      "slug-conflict",
      "Slugul este deja folosit sau rezervat de alt conținut.",
      {
        "snapshot.slug": [
          "Alege un slug unic pentru întregul conținut SmartMed.",
        ],
      },
    );
  }

  if (rpcCode === "23514") {
    return actionError(
      "channel-disabled",
      "Publicarea News nu este activată deoarece canalul public News nu a fost încă implementat.",
    );
  }

  if (rpcCode === "23503") {
    return actionError(
      "references-unavailable",
      "Un autor, o categorie, o etichetă, o relație sau o imagine nu mai este disponibilă.",
    );
  }

  if (rpcCode === "55000") {
    return actionError(
      "archived",
      "Conținutul arhivat este disponibil numai pentru citire.",
    );
  }

  if (rpcCode === "22023" || rpcCode === "22007") {
    return actionError(
      "invalid-input",
      "Datele editoriale nu respectă regulile de validare.",
    );
  }

  if (rpcCode === "42501") {
    return actionError(
      "forbidden",
      "Contul nu are drepturile necesare pentru această acțiune.",
    );
  }

  return actionError(
    error.code === "configuration" ? "configuration" : "unavailable",
    "Operația nu a putut fi finalizată momentan. Încearcă din nou.",
  );
}

async function runMutation(
  capability:
    | "content.archive"
    | "content.create"
    | "content.publish"
    | "content.unpublish"
    | "content.update",
  functionName: string,
  args: Record<string, Json | undefined>,
): Promise<AdminActionResult<CmsMutationReceipt>> {
  const authorization = await authorizeAdminCapability(capability);

  if (!authorization.ok) {
    return mapAuthorizationFailure(authorization.code);
  }

  try {
    const data = await executeCmsRpc(functionName, args);
    return {
      data: parseCmsMutationReceipt(data),
      ok: true,
    };
  } catch (error) {
    if (error instanceof AdminContentRepositoryError) {
      return mapRepositoryFailure(error);
    }

    return actionError(
      "unavailable",
      "Operația nu a putut fi finalizată momentan. Încearcă din nou.",
    );
  }
}

export async function createContentAction(
  input: CreateContentInput,
): Promise<AdminActionResult<CmsMutationReceipt>> {
  const parsed = createContentInputSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(
      "invalid-input",
      "Verifică datele noului conținut.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const result = await runMutation("content.create", "cms_create_content", {
    p_body: parsed.data.document as unknown as Json,
    p_change_summary: parsed.data.changeSummary ?? null,
    p_correlation_id: crypto.randomUUID(),
    p_kind: parsed.data.kind,
    p_snapshot: parsed.data.snapshot as unknown as Json,
  });

  if (result.ok) {
    revalidatePath("/admin");
    revalidatePath("/admin/content");
  }

  return result;
}

export async function saveContentDraftAction(
  input: SaveContentInput,
): Promise<AdminActionResult<CmsMutationReceipt>> {
  const parsed = saveContentInputSchema.safeParse(input);

  if (!parsed.success) {
    return actionError(
      "invalid-input",
      "Verifică metadatele și blocurile de conținut.",
      fieldErrorsFromZod(parsed.error),
    );
  }

  const result = await runMutation("content.update", "cms_save_draft", {
    p_body: parsed.data.document as unknown as Json,
    p_change_summary: parsed.data.changeSummary ?? null,
    p_correlation_id: crypto.randomUUID(),
    p_entry_id: parsed.data.entryId,
    p_expected_working_revision_id:
      parsed.data.expectedWorkingRevisionId,
    p_snapshot: parsed.data.snapshot as unknown as Json,
  });

  if (result.ok) {
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${parsed.data.entryId}`);
  }

  return result;
}

async function getTrustedContentKind(entryId: number) {
  try {
    return (await getAdminContentDetail(entryId)).entry.kind;
  } catch {
    return null;
  }
}

export async function publishContentAction(
  input: PublishContentInput,
): Promise<AdminActionResult<CmsMutationReceipt>> {
  const parsed = publishContentInputSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("invalid-input", "Identificatorul reviziei este invalid.");
  }

  const trustedKind = await getTrustedContentKind(parsed.data.entryId);

  if (trustedKind === "news") {
    return actionError(
      "channel-disabled",
      "Publicarea News nu este activată deoarece canalul public News nu a fost încă implementat.",
    );
  }

  const result = await runMutation("content.publish", "cms_publish_content", {
    p_correlation_id: crypto.randomUUID(),
    p_entry_id: parsed.data.entryId,
    p_expected_working_revision_id:
      parsed.data.expectedWorkingRevisionId,
  });

  if (result.ok) {
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${parsed.data.entryId}`);

    if (result.data.changed) {
      invalidatePublicBlogCache({
        newSlug: result.data.newSlug,
        oldSlug: result.data.oldSlug,
      });
    }
  }

  return result;
}

async function runVisibilityLifecycle(
  input: EntryLifecycleInput,
  operation: "archive" | "unpublish",
): Promise<AdminActionResult<CmsMutationReceipt>> {
  const parsed = entryLifecycleInputSchema.safeParse(input);

  if (!parsed.success) {
    return actionError("invalid-input", "Identificatorul conținutului este invalid.");
  }

  const trustedKind = await getTrustedContentKind(parsed.data.entryId);

  if (!trustedKind) {
    return actionError(
      "unavailable",
      "Tipul conținutului nu a putut fi verificat. Operația nu a fost executată.",
    );
  }

  const result = await runMutation(
    operation === "archive" ? "content.archive" : "content.unpublish",
    operation === "archive"
      ? "cms_archive_content"
      : "cms_unpublish_content",
    {
      p_correlation_id: crypto.randomUUID(),
      p_entry_id: parsed.data.entryId,
    },
  );

  if (result.ok) {
    revalidatePath("/admin/content");
    revalidatePath(`/admin/content/${parsed.data.entryId}`);

    if (result.data.changed && trustedKind === "blog") {
      invalidatePublicBlogCache({
        newSlug: result.data.newSlug,
        oldSlug: result.data.oldSlug,
      });
    }
  }

  return result;
}

export async function unpublishContentAction(input: EntryLifecycleInput) {
  return runVisibilityLifecycle(input, "unpublish");
}

export async function archiveContentAction(input: EntryLifecycleInput) {
  return runVisibilityLifecycle(input, "archive");
}
