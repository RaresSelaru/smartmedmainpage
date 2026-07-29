import {
  ArrowLeft,
  ArrowRight,
  Eye,
  FilePenLine,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { requireAdminCapability } from "@/lib/admin/auth";
import {
  buildAdminContentListHref,
  parseAdminContentListFilters,
  type AdminContentStatus,
} from "@/lib/admin/content-filters";
import {
  AdminContentRepositoryError,
  getAdminContentList,
} from "@/lib/admin/content-repository";
import type { AdminContentListItem } from "@/lib/admin/content-types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminContentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const statusLabels: Record<AdminContentStatus, string> = {
  archived: "Arhivat",
  draft: "Ciornă",
  published: "Publicat",
  review: "În verificare",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function StatusBadge({ item }: { item: AdminContentListItem }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={cn(
          "inline-flex rounded-full border px-3 py-1 text-xs font-bold",
          item.status === "published"
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : item.status === "archived"
              ? "border-slate-300 bg-slate-100 text-slate-700"
              : "border-amber-300 bg-amber-50 text-amber-900",
        )}
      >
        {statusLabels[item.status]}
      </span>
      {item.hasUnpublishedChanges ? (
        <span className="inline-flex rounded-full border border-smart-teal/25 bg-smart-aqua/10 px-3 py-1 text-xs font-bold text-smart-teal">
          Modificări nepublicate
        </span>
      ) : null}
      {!item.channelPublic ? (
        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
          Canal public dezactivat
        </span>
      ) : null}
    </div>
  );
}

function RowActions({ item }: { item: AdminContentListItem }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        aria-label={`Editează ${item.title}`}
        className="flex size-10 items-center justify-center rounded-xl border border-smart-abyss/12 bg-white text-smart-teal"
        href={`/admin/content/${item.id}`}
        title="Editează"
      >
        <FilePenLine aria-hidden="true" className="size-4" />
      </Link>
      {item.workingRevisionId ? (
        <Link
          aria-label={`Previzualizează ${item.title}`}
          className="flex size-10 items-center justify-center rounded-xl border border-smart-abyss/12 bg-white text-smart-teal"
          href={`/admin/content/${item.id}/preview?revision=${item.workingRevisionId}`}
          title="Previzualizează revizia de lucru"
        >
          <Eye aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

function EmptyOrError({ error }: { error?: string }) {
  return (
    <div className="rounded-[2rem] border border-smart-abyss/10 bg-white/70 px-6 py-14 text-center">
      <h2 className="font-serif text-3xl font-semibold">
        {error ? "Conținut indisponibil" : "Nu există rezultate"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-smart-ink/62">
        {error ??
          "Schimbă filtrele sau creează prima versiune editorială pentru acest canal."}
      </p>
    </div>
  );
}

export default async function AdminContentPage({
  searchParams,
}: AdminContentPageProps) {
  const params = await searchParams;
  const filters = parseAdminContentListFilters(params);
  const currentPath = buildAdminContentListHref(filters);
  await requireAdminCapability("content.read", { nextPath: currentPath });

  let page;
  let repositoryError: string | null = null;

  try {
    page = await getAdminContentList(filters);
  } catch (error) {
    repositoryError =
      error instanceof AdminContentRepositoryError &&
      error.code === "configuration"
        ? "Conexiunea editorială nu este configurată."
        : "Lista editorială nu a putut fi încărcată momentan.";
  }

  const totalPages = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;

  return (
    <div className="grid gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
            Modul editorial
          </p>
          <h1 className="mt-2 font-serif text-5xl font-semibold leading-none sm:text-6xl">
            Conținut
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-smart-ink/62">
            Blog și News folosesc același circuit de revizii. Numai Blog are un
            canal public activ.
          </p>
        </div>
        <Link
          className="flex min-h-12 items-center gap-2 rounded-2xl bg-smart-dark px-5 py-3 text-sm font-bold text-smart-white transition hover:bg-smart-teal"
          href="/admin/content/new"
        >
          <Plus aria-hidden="true" className="size-4" />
          Conținut nou
        </Link>
      </header>

      <form
        className="grid gap-4 rounded-[1.75rem] border border-smart-abyss/10 bg-white/70 p-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto_auto]"
        method="get"
      >
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-smart-ink/60">
          Canal
          <select
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-medium normal-case tracking-normal text-smart-ink"
            defaultValue={filters.kind ?? ""}
            name="kind"
          >
            <option value="">Toate</option>
            <option value="blog">Blog</option>
            <option value="news">News</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-smart-ink/60">
          Stare
          <select
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-medium normal-case tracking-normal text-smart-ink"
            defaultValue={filters.status ?? ""}
            name="status"
          >
            <option value="">Toate</option>
            <option value="draft">Ciornă</option>
            <option value="review">În verificare</option>
            <option value="published">Publicat</option>
            <option value="archived">Arhivat</option>
          </select>
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-smart-ink/60">
          ID categorie
          <input
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-medium normal-case tracking-normal text-smart-ink"
            defaultValue={filters.categoryId ?? ""}
            min={1}
            name="category"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.12em] text-smart-ink/60">
          ID autor
          <input
            className="min-h-11 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-medium normal-case tracking-normal text-smart-ink"
            defaultValue={filters.authorId ?? ""}
            min={1}
            name="author"
            type="number"
          />
        </label>
        <button
          className="min-h-11 self-end rounded-xl bg-smart-teal px-4 text-sm font-bold text-white"
          type="submit"
        >
          Aplică
        </button>
        <Link
          className="flex min-h-11 items-center justify-center self-end rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold text-smart-ink"
          href="/admin/content"
        >
          Resetează
        </Link>
      </form>

      {repositoryError ? (
        <EmptyOrError error={repositoryError} />
      ) : page?.items.length ? (
        <>
          <div className="hidden overflow-hidden rounded-[1.75rem] border border-smart-abyss/10 bg-white/75 md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-smart-dark text-smart-white">
                <tr>
                  <th className="px-5 py-4 font-bold">Titlu</th>
                  <th className="px-5 py-4 font-bold">Canal</th>
                  <th className="px-5 py-4 font-bold">Stare</th>
                  <th className="px-5 py-4 font-bold">Revizii</th>
                  <th className="px-5 py-4 font-bold">Actualizat</th>
                  <th className="px-5 py-4 font-bold">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((item) => (
                  <tr
                    className="border-t border-smart-abyss/8 align-top"
                    key={item.id}
                  >
                    <td className="px-5 py-5">
                      <Link
                        className="font-bold text-smart-ink hover:text-smart-teal"
                        href={`/admin/content/${item.id}`}
                      >
                        {item.title}
                      </Link>
                      <p className="mt-1 max-w-xs break-all text-xs text-smart-ink/48">
                        /{item.slug}
                      </p>
                    </td>
                    <td className="px-5 py-5 font-bold">
                      {item.kind === "blog" ? "Blog" : "News"}
                    </td>
                    <td className="px-5 py-5">
                      <StatusBadge item={item} />
                    </td>
                    <td className="px-5 py-5 text-xs leading-6 text-smart-ink/65">
                      <p>Lucru: #{item.workingRevisionNo ?? "—"}</p>
                      <p>Publicată: #{item.publishedRevisionId ?? "—"}</p>
                    </td>
                    <td className="px-5 py-5 text-xs text-smart-ink/62">
                      {formatDate(item.updatedAt)}
                    </td>
                    <td className="px-5 py-5">
                      <RowActions item={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {page.items.map((item) => (
              <article
                className="rounded-[1.5rem] border border-smart-abyss/10 bg-white/75 p-5"
                key={item.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-smart-teal">
                      {item.kind === "blog" ? "Blog" : "News"}
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold">
                      {item.title}
                    </h2>
                  </div>
                  <RowActions item={item} />
                </div>
                <div className="mt-4">
                  <StatusBadge item={item} />
                </div>
                <p className="mt-4 text-xs text-smart-ink/55">
                  Revizia de lucru #{item.workingRevisionNo ?? "—"} · actualizat{" "}
                  {formatDate(item.updatedAt)}
                </p>
              </article>
            ))}
          </div>
        </>
      ) : (
        <EmptyOrError />
      )}

      {page ? (
        <nav
          aria-label="Paginarea conținutului"
          className="flex items-center justify-between gap-4"
        >
          <Link
            aria-disabled={filters.page <= 1}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold",
              filters.page <= 1 && "pointer-events-none opacity-40",
            )}
            href={buildAdminContentListHref(filters, {
              page: Math.max(1, filters.page - 1),
            })}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Anterior
          </Link>
          <p className="text-sm text-smart-ink/60">
            Pagina <strong>{page.page}</strong> din <strong>{totalPages}</strong>{" "}
            · {page.total} rezultate
          </p>
          <Link
            aria-disabled={filters.page >= totalPages}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold",
              filters.page >= totalPages && "pointer-events-none opacity-40",
            )}
            href={buildAdminContentListHref(filters, {
              page: Math.min(totalPages, filters.page + 1),
            })}
          >
            Următor
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
