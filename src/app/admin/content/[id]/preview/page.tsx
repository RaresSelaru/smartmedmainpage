import { ArrowLeft, FileClock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminCapability } from "@/lib/admin/auth";
import {
  AdminContentRepositoryError,
  getAdminRevisionPreview,
} from "@/lib/admin/content-repository";
import { ContentRenderer } from "@/lib/content/renderer";
import type { PublicCmsMediaWidth } from "@/lib/content/media";
import {
  buildAdminCmsMediaUrl,
  type CmsMediaVariantKey,
} from "@/lib/media/cms-media-record";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminRevisionPreviewPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parsePositiveId(value: unknown) {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/u.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function getAdminPreviewMediaPath(
  mediaId: number,
  width: PublicCmsMediaWidth,
) {
  return buildAdminCmsMediaUrl(
    mediaId,
    String(width) as CmsMediaVariantKey,
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

export default async function AdminRevisionPreviewPage({
  params,
  searchParams,
}: AdminRevisionPreviewPageProps) {
  const [{ id: rawEntryId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const entryId = parsePositiveId(rawEntryId);
  const revisionId = parsePositiveId(query.revision);

  if (!entryId || !revisionId) notFound();

  const nextPath = `/admin/content/${entryId}/preview?revision=${revisionId}`;
  await requireAdminCapability("content.preview", { nextPath });

  let preview;

  try {
    preview = await getAdminRevisionPreview(entryId, revisionId);
  } catch (error) {
    if (
      error instanceof AdminContentRepositoryError &&
      error.code === "not-found"
    ) {
      notFound();
    }

    return (
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-smart-abyss/10 bg-white/75 p-8 text-center">
        <h1 className="font-serif text-4xl font-semibold">
          Previzualizare indisponibilă
        </h1>
        <p className="mt-4 text-sm leading-7 text-smart-ink/62">
          Revizia exactă nu a putut fi citită momentan. Nu este afișată o altă
          versiune în locul ei.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-smart-teal"
          href={`/admin/content/${entryId}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Înapoi la editor
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-8">
      <header className="rounded-[2rem] border border-smart-abyss/10 bg-white/75 p-5 sm:p-7">
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-smart-teal"
          href={`/admin/content/${entryId}`}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Înapoi la editor
        </Link>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-smart-teal/25 bg-smart-aqua/10 px-3 py-1 text-xs font-bold text-smart-teal">
            {preview.kind === "blog" ? "Blog" : "News"}
          </span>
          <span className="rounded-full border border-smart-abyss/12 bg-white px-3 py-1 text-xs font-bold">
            Revizia #{preview.revision.revisionNo}
          </span>
          {preview.isWorking ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
              În lucru
            </span>
          ) : null}
          {preview.isPublished ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              Publicată
            </span>
          ) : null}
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-smart-ink/50">
          <FileClock aria-hidden="true" className="size-4" />
          Captură exactă din {formatDate(preview.revision.createdAt)}
        </div>
      </header>

      <article className="rounded-[2.5rem] border border-smart-abyss/8 bg-white px-6 py-10 shadow-[0_28px_90px_rgba(3,17,28,0.08)] sm:px-10 lg:px-16">
        <header className="mb-10 border-b border-smart-abyss/10 pb-8">
          <h1 className="font-serif text-4xl font-semibold leading-tight sm:text-6xl">
            {preview.revision.snapshot.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-smart-ink/65">
            {preview.revision.snapshot.excerpt}
          </p>
        </header>
        <div className="prose-smart">
          <ContentRenderer
            document={preview.revision.body}
            entryId={preview.entryId}
            getMediaPath={getAdminPreviewMediaPath}
            schemaVersion={preview.revision.schemaVersion}
          />
        </div>
      </article>
    </div>
  );
}
