"use client";

import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Eye,
  LoaderCircle,
  RefreshCw,
  Save,
  Send,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  archiveContentAction,
  publishContentAction,
  saveContentDraftAction,
  unpublishContentAction,
} from "@/app/admin/content/actions";
import { ContentBlockEditor } from "@/components/admin/content-block-editor";
import {
  formatPositiveIdList,
  parseOptionalPositiveId,
  parseStrictPositiveIdList,
} from "@/lib/admin/content-form-utils";
import type { AdminContentDetail } from "@/lib/admin/content-types";
import {
  contentDocumentSchema,
  editorialSnapshotSchema,
} from "@/lib/content/schema";
import type {
  ContentDocument,
  EditorialSnapshotV1,
} from "@/lib/content/types";

type ContentEditorFormProps = {
  detail: AdminContentDetail;
};

type Feedback = {
  kind: "error" | "success";
  text: string;
} | null;

const fieldClass =
  "min-h-11 w-full rounded-xl border border-smart-abyss/12 bg-white px-3 py-2 text-sm outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25 disabled:bg-smart-cream/70 disabled:text-smart-ink/55";

const textareaClass = `${fieldClass} resize-y`;

function optionalText(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function fieldMessages(
  errors: Record<string, string[]>,
  ...paths: string[]
) {
  return paths.flatMap((path) => errors[path] ?? []);
}

function FieldErrors({
  errors,
  paths,
}: {
  errors: Record<string, string[]>;
  paths: string[];
}) {
  const messages = fieldMessages(errors, ...paths);

  return messages.length ? (
    <span className="grid gap-1 text-xs font-semibold text-red-700">
      {messages.map((message) => (
        <span key={message}>{message}</span>
      ))}
    </span>
  ) : null;
}

function formatDate(value: string | null) {
  if (!value) return "Niciodată";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function statusLabel(status: AdminContentDetail["entry"]["status"]) {
  if (status === "published") return "Publicat";
  if (status === "archived") return "Arhivat";
  if (status === "review") return "În verificare";
  return "Ciornă";
}

function normalizeClientValidationErrors(
  issues: ReadonlyArray<{ message: string; path: PropertyKey[] }>,
) {
  const errors: Record<string, string[]> = {};

  for (const issue of issues) {
    const path = issue.path.map(String).join(".") || "form";
    errors[path] ??= [];
    errors[path].push(issue.message);
  }

  return errors;
}

export function ContentEditorForm({ detail }: ContentEditorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialSnapshot = detail.workingRevision.snapshot;
  const [snapshot, setSnapshot] =
    useState<EditorialSnapshotV1>(initialSnapshot);
  const [document, setDocument] = useState<ContentDocument>(
    detail.workingRevision.body,
  );
  const [authorIdText, setAuthorIdText] = useState(
    initialSnapshot.authorId?.toString() ?? "",
  );
  const [coverMediaIdText, setCoverMediaIdText] = useState(
    initialSnapshot.coverMediaId?.toString() ?? "",
  );
  const [categoryIdsText, setCategoryIdsText] = useState(
    formatPositiveIdList(initialSnapshot.categoryIds),
  );
  const [tagIdsText, setTagIdsText] = useState(
    formatPositiveIdList(initialSnapshot.tagIds),
  );
  const [relatedEntryIdsText, setRelatedEntryIdsText] = useState(
    formatPositiveIdList(initialSnapshot.relatedEntryIds),
  );
  const [changeSummary, setChangeSummary] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const initialEditorState = useMemo(
    () =>
      JSON.stringify({
        authorIdText,
        categoryIdsText,
        coverMediaIdText,
        document,
        relatedEntryIdsText,
        snapshot,
        tagIdsText,
      }),
    // This captures the server revision once. A changed revision remounts via
    // the page key, so the baseline never moves behind the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const currentEditorState = JSON.stringify({
    authorIdText,
    categoryIdsText,
    coverMediaIdText,
    document,
    relatedEntryIdsText,
    snapshot,
    tagIdsText,
  });
  const dirty = currentEditorState !== initialEditorState;
  const archived = detail.entry.status === "archived";
  const isNews = detail.entry.kind === "news";
  const allFieldErrorMessages = [
    ...new Set(Object.values(fieldErrors).flat()),
  ].slice(0, 12);

  useEffect(() => {
    if (!dirty) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirty]);

  function updateSnapshot<Key extends keyof EditorialSnapshotV1>(
    key: Key,
    value: EditorialSnapshotV1[Key],
  ) {
    setSnapshot((current) => ({ ...current, [key]: value }));
  }

  function buildSnapshotForSave(): EditorialSnapshotV1 | null {
    const categoryIds = parseStrictPositiveIdList(categoryIdsText);
    const tagIds = parseStrictPositiveIdList(tagIdsText);
    const relatedEntryIds = parseStrictPositiveIdList(relatedEntryIdsText);
    const nextErrors: Record<string, string[]> = {};

    if (!categoryIds.ok) {
      nextErrors["snapshot.categoryIds"] = [
        "Folosește cel mult 100 de ID-uri pozitive, separate prin virgulă.",
      ];
    }
    if (!tagIds.ok) {
      nextErrors["snapshot.tagIds"] = [
        "Folosește cel mult 100 de ID-uri pozitive, separate prin virgulă.",
      ];
    }
    if (!relatedEntryIds.ok) {
      nextErrors["snapshot.relatedEntryIds"] = [
        "Folosește cel mult 100 de ID-uri pozitive, separate prin virgulă.",
      ];
    }

    const authorId = parseOptionalPositiveId(authorIdText);
    const coverMediaId = parseOptionalPositiveId(coverMediaIdText);

    if (authorIdText.trim() && !authorId) {
      nextErrors["snapshot.authorId"] = ["ID-ul autorului trebuie să fie pozitiv."];
    }
    if (coverMediaIdText.trim() && !coverMediaId) {
      nextErrors["snapshot.coverMediaId"] = [
        "ID-ul imaginii de copertă trebuie să fie pozitiv.",
      ];
    }

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setFeedback({
        kind: "error",
        text: "Corectează identificatorii editoriali înainte de salvare.",
      });
      return null;
    }

    const candidate: EditorialSnapshotV1 = {
      ...snapshot,
      authorId,
      categoryIds: categoryIds.ids,
      correctionNote: snapshot.correctionNote
        ? optionalText(snapshot.correctionNote)
        : null,
      coverMediaId,
      disclaimer: snapshot.disclaimer
        ? optionalText(snapshot.disclaimer)
        : null,
      excerpt: snapshot.excerpt.trim(),
      relatedEntryIds: relatedEntryIds.ids,
      reviewer: snapshot.reviewer ? optionalText(snapshot.reviewer) : null,
      seoDescription: snapshot.seoDescription
        ? optionalText(snapshot.seoDescription)
        : null,
      seoTitle: snapshot.seoTitle ? optionalText(snapshot.seoTitle) : null,
      slug: snapshot.slug.trim(),
      tagIds: tagIds.ids,
      title: snapshot.title.trim(),
    };
    const snapshotResult = editorialSnapshotSchema.safeParse(candidate);
    const documentResult = contentDocumentSchema.safeParse(document);

    if (!snapshotResult.success || !documentResult.success) {
      const issues = [
        ...(snapshotResult.success ? [] : snapshotResult.error.issues),
        ...(documentResult.success ? [] : documentResult.error.issues),
      ];
      setFieldErrors(normalizeClientValidationErrors(issues));
      setFeedback({
        kind: "error",
        text: "Metadatele sau blocurile nu respectă regulile editoriale.",
      });
      return null;
    }

    setSnapshot(snapshotResult.data);
    setDocument(documentResult.data);
    return snapshotResult.data;
  }

  function saveDraft() {
    if (archived) return;

    setFeedback(null);
    setFieldErrors({});
    const validatedSnapshot = buildSnapshotForSave();
    const validatedDocument = contentDocumentSchema.safeParse(document);

    if (!validatedSnapshot || !validatedDocument.success) return;

    startTransition(async () => {
      const result = await saveContentDraftAction({
        changeSummary: optionalText(changeSummary),
        document: validatedDocument.data,
        entryId: detail.entry.id,
        expectedWorkingRevisionId: detail.workingRevision.id,
        snapshot: validatedSnapshot,
      });

      if (!result.ok) {
        setFeedback({ kind: "error", text: result.message });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setFeedback({
        kind: "success",
        text: result.data.changed
          ? "Ciorna a fost salvată ca revizie nouă."
          : "Nu au existat modificări de salvat.",
      });
      setChangeSummary("");
      router.refresh();
    });
  }

  function runLifecycle(
    operation: "archive" | "publish" | "unpublish",
  ) {
    const confirmation =
      operation === "publish"
        ? "Publici exact revizia de lucru afișată?"
        : operation === "unpublish"
          ? "Retragi articolul din canalul public? Data primei publicări va fi păstrată."
          : "Arhivezi definitiv acest conținut? Restaurarea nu este inclusă în acest flux.";

    if (!window.confirm(confirmation)) return;

    setFeedback(null);
    setFieldErrors({});
    startTransition(async () => {
      const result =
        operation === "publish"
          ? await publishContentAction({
              entryId: detail.entry.id,
              expectedWorkingRevisionId: detail.workingRevision.id,
            })
          : operation === "unpublish"
            ? await unpublishContentAction({ entryId: detail.entry.id })
            : await archiveContentAction({ entryId: detail.entry.id });

      if (!result.ok) {
        setFeedback({ kind: "error", text: result.message });
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      setFeedback({
        kind: "success",
        text:
          operation === "publish"
            ? "Revizia a fost publicată."
            : operation === "unpublish"
              ? "Conținutul a fost retras din canalul public."
              : "Conținutul a fost arhivat și este acum numai pentru citire.",
      });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-7">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-sm font-bold text-smart-teal"
          href="/admin/content"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Înapoi la conținut
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-smart-teal/25 bg-smart-aqua/10 px-3 py-1 text-xs font-bold text-smart-teal">
                {detail.entry.kind === "blog" ? "Blog" : "News"}
              </span>
              <span className="rounded-full border border-smart-abyss/12 bg-white px-3 py-1 text-xs font-bold">
                {statusLabel(detail.entry.status)}
              </span>
              {detail.entry.publishedRevisionId !==
              detail.entry.workingRevisionId ? (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
                  Modificări nepublicate
                </span>
              ) : null}
              {dirty ? (
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-800">
                  Modificări nesalvate
                </span>
              ) : (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  Editor sincronizat
                </span>
              )}
            </div>
            <h1 className="mt-4 break-words font-serif text-4xl font-semibold leading-tight sm:text-6xl">
              {snapshot.title || "Fără titlu"}
            </h1>
            <p className="mt-3 text-sm text-smart-ink/55">
              Revizia de lucru #{detail.workingRevision.revisionNo} · salvată{" "}
              {formatDate(detail.workingRevision.createdAt)}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-smart-teal/25 bg-white px-4 py-2 text-sm font-bold text-smart-teal"
            href={`/admin/content/${detail.entry.id}/preview?revision=${detail.workingRevision.id}`}
          >
            <Eye aria-hidden="true" className="size-4" />
            Previzualizează revizia salvată
          </Link>
        </div>
      </header>

      {isNews ? (
        <p className="rounded-2xl border border-amber-300/45 bg-amber-50 px-5 py-4 text-sm font-semibold leading-6 text-amber-950">
          Publicarea News nu este activată deoarece canalul public News nu a
          fost încă implementat. Editarea, reviziile, media și previzualizarea
          rămân disponibile.
        </p>
      ) : null}

      {archived ? (
        <p className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-4 text-sm font-semibold text-slate-800">
          Conținutul arhivat este numai pentru citire. Restaurarea și ștergerea
          sunt în afara acestui flux.
        </p>
      ) : null}

      <form
        className="grid gap-7"
        onSubmit={(event) => {
          event.preventDefault();
          saveDraft();
        }}
      >
        <section className="grid gap-6 rounded-[2rem] border border-smart-abyss/10 bg-white/75 p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-smart-teal">
              Secțiunea 1
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">
              Metadate editoriale
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Titlu
              <input
                className={fieldClass}
                disabled={archived || pending}
                maxLength={160}
                onChange={(event) =>
                  updateSnapshot("title", event.target.value)
                }
                required
                value={snapshot.title}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.title", "title"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Slug global unic
              <input
                className={fieldClass}
                disabled={archived || pending}
                maxLength={160}
                onChange={(event) =>
                  updateSnapshot("slug", event.target.value)
                }
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
                value={snapshot.slug}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.slug", "slug"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold lg:col-span-2">
              Rezumat
              <textarea
                className={`${textareaClass} min-h-28`}
                disabled={archived || pending}
                maxLength={320}
                onChange={(event) =>
                  updateSnapshot("excerpt", event.target.value)
                }
                required
                value={snapshot.excerpt}
              />
              <span className="text-xs font-normal text-smart-ink/50">
                {snapshot.excerpt.length}/320
              </span>
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.excerpt", "excerpt"]}
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold">
              ID autor
              <input
                className={fieldClass}
                disabled={archived || pending}
                inputMode="numeric"
                min={1}
                onChange={(event) => setAuthorIdText(event.target.value)}
                value={authorIdText}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.authorId", "authorId"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              ID media copertă
              <input
                className={fieldClass}
                disabled={archived || pending}
                inputMode="numeric"
                min={1}
                onChange={(event) => setCoverMediaIdText(event.target.value)}
                value={coverMediaIdText}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.coverMediaId", "coverMediaId"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              ID-uri categorii
              <input
                className={fieldClass}
                disabled={archived || pending}
                onChange={(event) => setCategoryIdsText(event.target.value)}
                placeholder="1, 2"
                value={categoryIdsText}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.categoryIds", "categoryIds"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              ID-uri etichete
              <input
                className={fieldClass}
                disabled={archived || pending}
                onChange={(event) => setTagIdsText(event.target.value)}
                placeholder="3, 4"
                value={tagIdsText}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.tagIds", "tagIds"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">
              ID-uri conținut asociat
              <input
                className={fieldClass}
                disabled={archived || pending}
                onChange={(event) =>
                  setRelatedEntryIdsText(event.target.value)
                }
                placeholder="12, 18"
                value={relatedEntryIdsText}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.relatedEntryIds", "relatedEntryIds"]}
              />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Titlu SEO
              <input
                className={fieldClass}
                disabled={archived || pending}
                maxLength={70}
                onChange={(event) =>
                  updateSnapshot("seoTitle", event.target.value || null)
                }
                value={snapshot.seoTitle ?? ""}
              />
              <span className="text-xs font-normal text-smart-ink/50">
                {snapshot.seoTitle?.length ?? 0}/70
              </span>
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.seoTitle", "seoTitle"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Descriere SEO
              <textarea
                className={`${textareaClass} min-h-24`}
                disabled={archived || pending}
                maxLength={180}
                onChange={(event) =>
                  updateSnapshot(
                    "seoDescription",
                    event.target.value || null,
                  )
                }
                value={snapshot.seoDescription ?? ""}
              />
              <span className="text-xs font-normal text-smart-ink/50">
                {snapshot.seoDescription?.length ?? 0}/180
              </span>
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.seoDescription", "seoDescription"]}
              />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Revizor
              <input
                className={fieldClass}
                disabled={archived || pending}
                maxLength={500}
                onChange={(event) =>
                  updateSnapshot("reviewer", event.target.value || null)
                }
                value={snapshot.reviewer ?? ""}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.reviewer", "reviewer"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Data verificării (ISO 8601)
              <input
                className={fieldClass}
                disabled={archived || pending}
                onChange={(event) =>
                  updateSnapshot("reviewDate", event.target.value || null)
                }
                placeholder="2026-07-29T10:30:00+03:00"
                value={snapshot.reviewDate ?? ""}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.reviewDate", "reviewDate"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Disclaimer
              <textarea
                className={`${textareaClass} min-h-24`}
                disabled={archived || pending}
                maxLength={500}
                onChange={(event) =>
                  updateSnapshot("disclaimer", event.target.value || null)
                }
                value={snapshot.disclaimer ?? ""}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.disclaimer", "disclaimer"]}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Notă de corecție
              <textarea
                className={`${textareaClass} min-h-24`}
                disabled={archived || pending}
                maxLength={500}
                onChange={(event) =>
                  updateSnapshot(
                    "correctionNote",
                    event.target.value || null,
                  )
                }
                value={snapshot.correctionNote ?? ""}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.correctionNote", "correctionNote"]}
              />
            </label>
          </div>

          <dl className="grid gap-4 rounded-2xl bg-smart-cream/70 p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-bold text-smart-ink/55">
                Prima publicare
              </dt>
              <dd className="mt-1">{formatDate(detail.entry.publishedAt)}</dd>
            </div>
            <div>
              <dt className="font-bold text-smart-ink/55">
                Revizie publică
              </dt>
              <dd className="mt-1">
                {detail.entry.publishedRevisionId
                  ? `#${detail.entry.publishedRevisionId}`
                  : "Niciuna"}
              </dd>
            </div>
            <div>
              <dt className="font-bold text-smart-ink/55">Vizibilitate</dt>
              <dd className="mt-1">{detail.entry.visibility}</dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-smart-teal">
              Secțiunea 2
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">
              Corpul articolului
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-smart-ink/60">
              Textul bogat este convertit la limita editorului în structura
              SmartMed. Sunt păstrate numai blocurile, legăturile și marcajele
              aprobate.
            </p>
          </div>
          <ContentBlockEditor
            disabled={archived || pending}
            document={document}
            onChange={setDocument}
          />
          <FieldErrors errors={fieldErrors} paths={["document", "form"]} />
        </section>

        {!archived ? (
          <section className="sticky bottom-4 z-20 grid gap-4 rounded-[1.75rem] border border-smart-abyss/12 bg-white/95 p-4 shadow-[0_20px_60px_rgba(3,17,28,0.16)] backdrop-blur sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <label className="grid gap-2 text-sm font-bold">
                Rezumatul modificării
                <input
                  className={fieldClass}
                  disabled={pending}
                  maxLength={500}
                  onChange={(event) => setChangeSummary(event.target.value)}
                  placeholder="Ce s-a schimbat în această revizie?"
                  value={changeSummary}
                />
              </label>
              <button
                className="flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-smart-dark px-5 py-2 text-sm font-bold text-smart-white disabled:cursor-wait disabled:opacity-50"
                disabled={pending || !dirty}
                type="submit"
              >
                {pending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <Save aria-hidden="true" className="size-4" />
                )}
                Salvează ciorna
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-smart-abyss/8 pt-4">
              <button
                className="flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  pending ||
                  dirty ||
                  isNews ||
                  detail.entry.publishedRevisionId ===
                    detail.entry.workingRevisionId
                }
                onClick={() => runLifecycle("publish")}
                type="button"
              >
                <Send aria-hidden="true" className="size-4" />
                Publică revizia de lucru
              </button>
              <button
                className="flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={pending || dirty || detail.entry.status !== "published"}
                onClick={() => runLifecycle("unpublish")}
                type="button"
              >
                <Undo2 aria-hidden="true" className="size-4" />
                Retrage
              </button>
              <button
                className="flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={pending || dirty}
                onClick={() => runLifecycle("archive")}
                type="button"
              >
                <Archive aria-hidden="true" className="size-4" />
                Arhivează
              </button>
              {dirty ? (
                <span className="text-xs font-semibold text-smart-ink/55">
                  Salvează ciorna înainte de o acțiune de ciclu de viață.
                </span>
              ) : null}
            </div>
          </section>
        ) : null}
      </form>

      {feedback ? (
        <div
          aria-live="polite"
          className={
            feedback.kind === "success"
              ? "flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-900"
              : "rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-900"
          }
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.kind === "success" ? (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4" />
          ) : null}
          <div>
            <p>{feedback.text}</p>
            {feedback.kind === "error" && allFieldErrorMessages.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 font-normal">
                {allFieldErrorMessages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      {feedback?.kind === "error" ? (
        <button
          className="flex min-h-11 w-fit items-center gap-2 rounded-xl border border-smart-abyss/12 bg-white px-4 py-2 text-sm font-bold text-smart-teal"
          onClick={() => router.refresh()}
          type="button"
        >
          <RefreshCw aria-hidden="true" className="size-4" />
          Reîncarcă versiunea salvată
        </button>
      ) : null}
    </div>
  );
}
