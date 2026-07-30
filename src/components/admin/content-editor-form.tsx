"use client";

import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Eye,
  ImagePlus,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Undo2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  archiveContentAction,
  publishContentAction,
  saveContentDraftAction,
  unpublishContentAction,
} from "@/app/admin/content/actions";
import { ContentBlockEditor } from "@/components/admin/content-block-editor";
import type {
  AdminContentDetail,
  AdminContentEditorOptions,
} from "@/lib/admin/content-types";
import { slugifyEditorialTitle } from "@/lib/admin/content-form-utils";
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
  options: AdminContentEditorOptions;
};

type Feedback = {
  kind: "error" | "success";
  text: string;
} | null;

const fieldClass =
  "min-h-11 w-full rounded-xl border border-smart-abyss/12 bg-white px-3 py-2 text-sm outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25 disabled:bg-smart-cream/70 disabled:text-smart-ink/55";

const textareaClass = `${fieldClass} resize-y`;

const MAX_CARD_TAGS = 3;

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

function CoverImagePicker({
  coverMediaId,
  disabled,
  onChange,
  title,
}: {
  coverMediaId: number | null;
  disabled: boolean;
  onChange: (mediaId: number | null) => void;
  title: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(
    null,
  );
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewUrl =
    uploadedPreviewUrl ??
    (coverMediaId ? `/admin/media/${coverMediaId}/1280` : null);
  const hasPreview = Boolean(previewUrl && !previewFailed);

  async function uploadCover(file: File) {
    setUploading(true);
    setMessage(null);
    setPreviewFailed(false);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", title.trim() || file.name);
    formData.set(
      "altText",
      title.trim()
        ? `Imagine de copertă pentru articolul „${title.trim()}”`
        : "Imagine de copertă pentru un articol SmartMed",
    );
    formData.set("decorative", "false");

    try {
      const response = await fetch("/admin/api/media", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: {
          id?: number;
          variants?: Array<{ key?: string; url?: string }>;
        };
        message?: string;
        ok?: boolean;
      };
      const mediaId = payload.data?.id;

      if (
        !response.ok ||
        payload.ok !== true ||
        !Number.isSafeInteger(mediaId) ||
        (mediaId ?? 0) <= 0
      ) {
        setMessage(payload.message ?? "Coperta nu a putut fi încărcată.");
        return;
      }

      const preferredPreview =
        payload.data?.variants?.find((variant) => variant.key === "1280")
          ?.url ??
        payload.data?.variants?.find((variant) => variant.key === "original")
          ?.url ??
        `/admin/media/${mediaId}/1280`;

      setUploadedPreviewUrl(preferredPreview);
      onChange(mediaId ?? null);
      setMessage(
        "Coperta este selectată. Salvează articolul pentru a păstra modificarea.",
      );
    } catch {
      setMessage("Coperta nu a putut fi încărcată. Încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div
        className="group relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-dashed border-smart-teal/35 bg-smart-cream/70"
        onDragOver={(event) => {
          if (!disabled) event.preventDefault();
        }}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file) void uploadCover(file);
        }}
      >
        {hasPreview && previewUrl ? (
          <Image
            alt={`Previzualizarea copertei pentru ${title || "articol"}`}
            className="object-cover"
            fill
            onError={() => setPreviewFailed(true)}
            sizes="(max-width: 1024px) 100vw, 44vw"
            src={previewUrl}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-smart-ink/55">
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-smart-teal shadow-sm">
              <ImagePlus aria-hidden="true" className="size-6" />
            </span>
            <span className="font-serif text-2xl font-semibold text-smart-ink">
              Alege coperta articolului
            </span>
            <span className="max-w-sm text-sm leading-6">
              Apasă aici sau trage imaginea în această zonă.
            </span>
          </div>
        )}

        <label className="absolute inset-0 flex cursor-pointer items-end justify-center bg-gradient-to-t from-smart-abyss/70 via-transparent to-transparent p-5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-smart-teal shadow-lg">
            {uploading ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <ImagePlus aria-hidden="true" className="size-4" />
            )}
            {hasPreview ? "Schimbă imaginea" : "Selectează imaginea"}
          </span>
          <input
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadCover(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>

        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-smart-abyss/65 text-sm font-bold text-white backdrop-blur-sm">
            <LoaderCircle
              aria-hidden="true"
              className="mr-2 size-5 animate-spin"
            />
            Se pregătește coperta…
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-smart-ink/55">
        <span>JPG, PNG sau WebP. Imaginea este optimizată automat.</span>
        {coverMediaId ? (
          <button
            className="inline-flex items-center gap-1.5 font-bold text-red-700 disabled:opacity-40"
            disabled={disabled || uploading}
            onClick={() => {
              setUploadedPreviewUrl(null);
              setPreviewFailed(false);
              setMessage(null);
              onChange(null);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Elimină coperta
          </button>
        ) : null}
      </div>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-xl bg-smart-aqua/10 px-3 py-2 text-sm font-semibold text-smart-teal"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function ContentEditorForm({
  detail,
  options,
}: ContentEditorFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialSnapshot = detail.workingRevision.snapshot;
  const [snapshot, setSnapshot] =
    useState<EditorialSnapshotV1>(initialSnapshot);
  const [document, setDocument] = useState<ContentDocument>(
    detail.workingRevision.body,
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [documentEditorValid, setDocumentEditorValid] = useState(true);
  const [documentEditorMessage, setDocumentEditorMessage] = useState<
    string | null
  >(null);

  const initialEditorState = useMemo(
    () =>
      JSON.stringify({
        document,
        snapshot,
      }),
    // This captures the server revision once. A changed revision remounts via
    // the page key, so the baseline never moves behind the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const currentEditorState = JSON.stringify({
    document,
    snapshot,
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

  const handleDocumentValidityChange = useCallback(
    (valid: boolean, message?: string) => {
      setDocumentEditorValid(valid);
      setDocumentEditorMessage(message ?? null);
    },
    [],
  );

  function buildSnapshotForSave(): EditorialSnapshotV1 | null {
    const candidate: EditorialSnapshotV1 = {
      ...snapshot,
      correctionNote: snapshot.correctionNote
        ? optionalText(snapshot.correctionNote)
        : null,
      disclaimer: snapshot.disclaimer
        ? optionalText(snapshot.disclaimer)
        : null,
      excerpt: snapshot.excerpt.trim(),
      reviewer: snapshot.reviewer ? optionalText(snapshot.reviewer) : null,
      seoDescription: snapshot.seoDescription
        ? optionalText(snapshot.seoDescription)
        : null,
      seoTitle: snapshot.seoTitle ? optionalText(snapshot.seoTitle) : null,
      slug: snapshot.slug.trim(),
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
    if (archived || !dirty || !documentEditorValid) {
      if (!documentEditorValid) {
        setFeedback({
          kind: "error",
          text:
            documentEditorMessage ??
            "Corectează conținutul articolului înainte de salvare.",
        });
      }
      return;
    }

    setFeedback(null);
    setFieldErrors({});
    const validatedSnapshot = buildSnapshotForSave();
    const validatedDocument = contentDocumentSchema.safeParse(document);

    if (!validatedSnapshot || !validatedDocument.success) return;

    startTransition(async () => {
      const result = await saveContentDraftAction({
        changeSummary: "Actualizare articol",
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
        text: "Articolul a fost salvat.",
      });
      router.refresh();
    });
  }

  function publishArticle() {
    if (
      archived ||
      isNews ||
      !documentEditorValid ||
      !window.confirm(
        dirty
          ? "Salvăm modificările și publicăm articolul pe site?"
          : "Publicăm articolul pe site?",
      )
    ) {
      return;
    }

    setFeedback(null);
    setFieldErrors({});
    const validatedSnapshot = dirty ? buildSnapshotForSave() : snapshot;
    const validatedDocument = contentDocumentSchema.safeParse(document);

    if (!validatedSnapshot || !validatedDocument.success) return;

    startTransition(async () => {
      let workingRevisionId = detail.workingRevision.id;

      if (dirty) {
        const saveResult = await saveContentDraftAction({
          changeSummary: "Actualizare înainte de publicare",
          document: validatedDocument.data,
          entryId: detail.entry.id,
          expectedWorkingRevisionId: detail.workingRevision.id,
          snapshot: validatedSnapshot,
        });

        if (!saveResult.ok || !saveResult.data.workingRevisionId) {
          setFeedback({
            kind: "error",
            text: saveResult.ok
              ? "Articolul a fost salvat, dar revizia nu a putut fi pregătită pentru publicare."
              : saveResult.message,
          });
          setFieldErrors(saveResult.ok ? {} : (saveResult.fieldErrors ?? {}));
          router.refresh();
          return;
        }

        workingRevisionId = saveResult.data.workingRevisionId;
      }

      const publishResult = await publishContentAction({
        entryId: detail.entry.id,
        expectedWorkingRevisionId: workingRevisionId,
      });

      if (!publishResult.ok) {
        setFeedback({ kind: "error", text: publishResult.message });
        setFieldErrors(publishResult.fieldErrors ?? {});
        router.refresh();
        return;
      }

      setFeedback({
        kind: "success",
        text: "Articolul este publicat pe site.",
      });
      router.refresh();
    });
  }

  function runLifecycle(operation: "archive" | "unpublish") {
    const confirmation =
      operation === "unpublish"
        ? "Retragi articolul din canalul public? Data primei publicări va fi păstrată."
        : "Arhivezi definitiv acest conținut? Restaurarea nu este inclusă în acest flux.";

    if (!window.confirm(confirmation)) return;

    setFeedback(null);
    setFieldErrors({});
    startTransition(async () => {
      const result =
        operation === "unpublish"
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
          operation === "unpublish"
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
        <section className="grid gap-7 rounded-[2rem] border border-smart-abyss/10 bg-white/75 p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-smart-teal">
              Pasul 1
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">
              Cum apare articolul în Blog
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-smart-ink/60">
              Alege coperta, scrie titlul și selectează etichetele care apar pe
              cardul articolului.
            </p>
          </div>

          <div className="grid gap-7 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
            <div className="grid gap-2">
              <span className="text-sm font-bold">Coperta articolului</span>
              <CoverImagePicker
                coverMediaId={snapshot.coverMediaId}
                disabled={archived || pending}
                onChange={(mediaId) =>
                  updateSnapshot("coverMediaId", mediaId)
                }
                title={snapshot.title}
              />
              <FieldErrors
                errors={fieldErrors}
                paths={["snapshot.coverMediaId", "coverMediaId"]}
              />
            </div>

            <div className="grid gap-5">
              <label className="grid gap-2 text-sm font-bold">
                Titlul articolului
                <input
                  className={`${fieldClass} min-h-14 text-base`}
                  disabled={archived || pending}
                  maxLength={160}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    setSnapshot((current) => ({
                      ...current,
                      slug:
                        detail.entry.publishedAt === null
                          ? slugifyEditorialTitle(nextTitle) || current.slug
                          : current.slug,
                      title: nextTitle,
                    }));
                  }}
                  placeholder="Scrie un titlu clar și ușor de înțeles"
                  required
                  value={snapshot.title}
                />
                <FieldErrors
                  errors={fieldErrors}
                  paths={["snapshot.title", "title", "snapshot.slug", "slug"]}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                Descriere scurtă
                <textarea
                  className={`${textareaClass} min-h-28`}
                  disabled={archived || pending}
                  maxLength={320}
                  onChange={(event) =>
                    updateSnapshot("excerpt", event.target.value)
                  }
                  placeholder="Două fraze care explică pe scurt ce va afla cititorul"
                  required
                  value={snapshot.excerpt}
                />
                <span className="flex justify-between gap-3 text-xs font-normal text-smart-ink/50">
                  <span>Apare sub titlu în pagina articolului.</span>
                  <span>{snapshot.excerpt.length}/320</span>
                </span>
                <FieldErrors
                  errors={fieldErrors}
                  paths={["snapshot.excerpt", "excerpt"]}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                Categoria
                <select
                  className={fieldClass}
                  disabled={archived || pending}
                  onChange={(event) =>
                    updateSnapshot(
                      "categoryIds",
                      event.target.value ? [Number(event.target.value)] : [],
                    )
                  }
                  value={snapshot.categoryIds[0]?.toString() ?? ""}
                >
                  <option value="">Alege categoria</option>
                  {options.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <FieldErrors
                  errors={fieldErrors}
                  paths={["snapshot.categoryIds", "categoryIds"]}
                />
              </label>
            </div>
          </div>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-bold">Etichete</legend>
            <p className="text-xs leading-5 text-smart-ink/55">
              Alege până la {MAX_CARD_TAGS}. Primele două apar direct pe card,
              iar restul sunt grupate automat.
            </p>
            <div className="flex flex-wrap gap-2">
              {options.tags.map((tag) => {
                const selected = snapshot.tagIds.includes(tag.id);
                const atLimit =
                  snapshot.tagIds.length >= MAX_CARD_TAGS && !selected;

                return (
                  <button
                    aria-pressed={selected}
                    className={
                      selected
                        ? "rounded-full border border-smart-teal bg-smart-teal px-4 py-2 text-sm font-bold text-white shadow-sm"
                        : "rounded-full border border-smart-abyss/12 bg-white px-4 py-2 text-sm font-bold text-smart-ink/70 transition hover:border-smart-teal hover:text-smart-teal disabled:cursor-not-allowed disabled:opacity-35"
                    }
                    disabled={archived || pending || atLimit}
                    key={tag.id}
                    onClick={() =>
                      updateSnapshot(
                        "tagIds",
                        selected
                          ? snapshot.tagIds.filter((tagId) => tagId !== tag.id)
                          : [...snapshot.tagIds, tag.id],
                      )
                    }
                    type="button"
                  >
                    {selected ? "✓ " : ""}
                    {tag.name}
                  </button>
                );
              })}
            </div>
            <FieldErrors
              errors={fieldErrors}
              paths={["snapshot.tagIds", "tagIds"]}
            />
          </fieldset>
        </section>

        <section className="grid gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-smart-teal">
              Pasul 2
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">
              Scrie articolul
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-smart-ink/60">
              Scrie continuu ca într-un document Word. Din bara de instrumente
              poți transforma orice rând în titlu, listă sau citat și poți
              insera imagini ori videoclipuri exact la poziția cursorului.
            </p>
          </div>
          <ContentBlockEditor
            disabled={archived || pending}
            document={document}
            onChange={setDocument}
            onValidityChange={handleDocumentValidityChange}
          />
          <FieldErrors errors={fieldErrors} paths={["document", "form"]} />
        </section>

        {!archived ? (
          <section className="sticky bottom-4 z-20 grid gap-3 rounded-[1.75rem] border border-smart-abyss/12 bg-white/95 p-4 shadow-[0_20px_60px_rgba(3,17,28,0.16)] backdrop-blur sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 text-sm font-semibold text-smart-ink/60">
                <span
                  aria-hidden="true"
                  className={
                    !documentEditorValid
                      ? "size-2.5 rounded-full bg-red-500"
                      : dirty
                      ? "size-2.5 rounded-full bg-amber-500"
                      : "size-2.5 rounded-full bg-emerald-500"
                  }
                />
                {!documentEditorValid
                  ? "Corectează elementul evidențiat înainte de salvare."
                  : dirty
                  ? "Ai modificări care nu sunt încă salvate."
                  : "Toate modificările sunt salvate."}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-smart-abyss/15 bg-white px-5 py-2 text-sm font-bold text-smart-ink disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={pending || !dirty || !documentEditorValid}
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
                  Salvează
                </button>
                <button
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-smart-dark px-5 py-2 text-sm font-bold text-smart-white transition hover:bg-smart-teal disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={
                    pending ||
                    isNews ||
                    !documentEditorValid ||
                    (!dirty &&
                      detail.entry.publishedRevisionId ===
                        detail.entry.workingRevisionId)
                  }
                  onClick={publishArticle}
                  type="button"
                >
                  {pending ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <Send aria-hidden="true" className="size-4" />
                  )}
                  {dirty
                    ? "Salvează și publică"
                    : detail.entry.publishedRevisionId
                      ? "Publică modificările"
                      : "Publică articolul"}
                </button>
              </div>
            </div>

            <details className="border-t border-smart-abyss/8 pt-3">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-xs font-bold text-smart-ink/55 marker:hidden">
                <MoreHorizontal aria-hidden="true" className="size-4" />
                Mai multe acțiuni
              </summary>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={
                    pending || dirty || detail.entry.status !== "published"
                  }
                  onClick={() => runLifecycle("unpublish")}
                  type="button"
                >
                  <Undo2 aria-hidden="true" className="size-4" />
                  Retrage de pe site
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
                    Salvează înainte de a retrage sau arhiva articolul.
                  </span>
                ) : null}
              </div>
            </details>
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
