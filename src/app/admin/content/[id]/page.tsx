import { ArrowLeft, Eye } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentEditorForm } from "@/components/admin/content-editor-form";
import { requireAdminCapability } from "@/lib/admin/auth";
import {
  AdminContentRepositoryError,
  getAdminContentDetail,
} from "@/lib/admin/content-repository";
import type { AdminRevisionHistoryItem } from "@/lib/admin/content-types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminContentEditPageProps = {
  params: Promise<{ id: string }>;
};

function parseEntryId(value: string) {
  if (!/^[1-9][0-9]*$/u.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function actorLabel(actorId: string | null) {
  if (!actorId) return "Sistem / autor necunoscut";
  return `${actorId.slice(0, 8)}…${actorId.slice(-4)}`;
}

function RevisionRow({
  entryId,
  revision,
}: {
  entryId: number;
  revision: AdminRevisionHistoryItem;
}) {
  return (
    <tr className="border-t border-smart-abyss/8 align-top">
      <td className="px-4 py-4 font-bold">#{revision.revisionNo}</td>
      <td className="px-4 py-4 text-smart-ink/65">
        {formatDate(revision.createdAt)}
      </td>
      <td className="px-4 py-4 font-mono text-xs text-smart-ink/60">
        {actorLabel(revision.createdBy)}
      </td>
      <td className="max-w-md px-4 py-4 text-smart-ink/70">
        {revision.changeSummary || "Fără rezumat editorial"}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {revision.isWorking ? (
            <span className="rounded-full border border-smart-teal/25 bg-smart-aqua/10 px-2.5 py-1 text-xs font-bold text-smart-teal">
              În lucru
            </span>
          ) : null}
          {revision.isPublished ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
              Publicată
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-bold",
              revision.schemaVersion === 1
                ? "border-slate-200 bg-slate-50 text-slate-700"
                : "border-amber-200 bg-amber-50 text-amber-900",
            )}
          >
            Schema v{revision.schemaVersion}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        <Link
          aria-label={`Previzualizează revizia ${revision.revisionNo}`}
          className="inline-flex size-10 items-center justify-center rounded-xl border border-smart-abyss/12 bg-white text-smart-teal"
          href={`/admin/content/${entryId}/preview?revision=${revision.id}`}
          title="Previzualizează exact această revizie"
        >
          <Eye aria-hidden="true" className="size-4" />
        </Link>
      </td>
    </tr>
  );
}

export default async function AdminContentEditPage({
  params,
}: AdminContentEditPageProps) {
  const { id: rawId } = await params;
  const entryId = parseEntryId(rawId);

  if (!entryId) notFound();

  await requireAdminCapability("content.read", {
    nextPath: `/admin/content/${entryId}`,
  });

  let detail;

  try {
    detail = await getAdminContentDetail(entryId);
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
          Conținut indisponibil
        </h1>
        <p className="mt-4 text-sm leading-7 text-smart-ink/62">
          Revizia editorială nu a putut fi încărcată momentan. Nicio modificare
          nu a fost efectuată.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-smart-teal"
          href="/admin/content"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Înapoi la conținut
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      <ContentEditorForm
        detail={detail}
        key={`${detail.workingRevision.id}-${detail.entry.status}-${detail.entry.publishedRevisionId ?? "none"}`}
      />

      <section className="grid gap-5" id="istoric">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-smart-teal">
            Istoric nemodificabil
          </p>
          <h2 className="mt-2 font-serif text-4xl font-semibold">
            Revizii
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-smart-ink/60">
            Fiecare rând este o captură editorială exactă. Revenirea la o
            versiune anterioară este amânată; istoricul poate fi doar citit și
            previzualizat.
          </p>
        </header>

        <div className="overflow-x-auto rounded-[1.75rem] border border-smart-abyss/10 bg-white/75">
          <table className="min-w-[900px] w-full border-collapse text-left text-sm">
            <thead className="bg-smart-dark text-smart-white">
              <tr>
                <th className="px-4 py-4 font-bold">Revizie</th>
                <th className="px-4 py-4 font-bold">Creată</th>
                <th className="px-4 py-4 font-bold">Actor</th>
                <th className="px-4 py-4 font-bold">Rezumat</th>
                <th className="px-4 py-4 font-bold">Indicatori</th>
                <th className="px-4 py-4 font-bold">Previzualizare</th>
              </tr>
            </thead>
            <tbody>
              {detail.history.map((revision) => (
                <RevisionRow
                  entryId={detail.entry.id}
                  key={revision.id}
                  revision={revision}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
