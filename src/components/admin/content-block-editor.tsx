"use client";

import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
  $copyBlockFormatIndent,
  $setBlocksType,
} from "@lexical/selection";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text";
import { $insertNodeToNearestRoot } from "@lexical/utils";
import {
  AlertCircle,
  Bold,
  ImagePlus,
  Italic,
  Link2,
  List as ListIcon,
  ListOrdered,
  LoaderCircle,
  Play,
  Redo2,
  Undo2,
  Unlink,
  Video,
  X,
} from "lucide-react";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  $setSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  ParagraphNode,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type BaseSelection,
  type EditorState,
  type ElementNode,
  type LexicalNode,
} from "lexical";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  $createSmartMedImageNode,
  $createSmartMedYouTubeNode,
  approvedSmartMedLexicalNodes,
} from "@/components/admin/lexical-content-nodes";
import {
  contentDocumentToLexicalState,
  lexicalStateToContentDocument,
} from "@/lib/admin/lexical-conversion";
import {
  $copySmartMedContentId,
  $ensureSmartMedContentId,
} from "@/lib/admin/lexical-node-state";
import { parseYouTubeVideoId } from "@/lib/admin/youtube";
import {
  normalizeContentHref,
  safeParseContentDocument,
} from "@/lib/content/schema";
import type {
  ContentDocument,
  ImageBlock,
  YouTubeBlock,
} from "@/lib/content/types";
import { cn } from "@/lib/utils";

type ContentBlockEditorProps = {
  disabled?: boolean;
  document: ContentDocument;
  onChange: (document: ContentDocument) => void;
  onValidityChange?: (valid: boolean, message?: string) => void;
};

type BlockStyle = "bullet" | "h2" | "h3" | "number" | "paragraph" | "quote";
type EditorDialogType = "image" | "link" | "youtube";

const dialogFieldClass =
  "min-h-12 w-full rounded-xl border border-smart-abyss/15 bg-white px-4 py-3 text-base text-smart-ink outline-none transition focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/30 disabled:cursor-not-allowed disabled:bg-smart-cream/70";

function ToolbarButton({
  active = false,
  children,
  disabled,
  label,
  onClick,
  wide = false,
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
  wide?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-smart-teal disabled:cursor-not-allowed disabled:opacity-30",
        active
          ? "bg-smart-teal text-white shadow-sm"
          : "text-smart-ink/65 hover:bg-smart-teal/10 hover:text-smart-teal",
        wide ? "min-w-fit" : "w-11 px-0",
      )}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function findTopLevelNode(node: LexicalNode): LexicalNode {
  let current = node;
  let parent = current.getParent();

  while (parent && !$isRootNode(parent)) {
    current = parent;
    parent = current.getParent();
  }

  return current;
}

function selectionBlockStyle(selection: BaseSelection | null): BlockStyle {
  if (!$isRangeSelection(selection)) return "paragraph";

  const topLevel = findTopLevelNode(selection.anchor.getNode());

  if ($isHeadingNode(topLevel)) {
    return topLevel.getTag() === "h3" ? "h3" : "h2";
  }

  if ($isQuoteNode(topLevel)) return "quote";

  if ($isListNode(topLevel)) {
    return topLevel.getListType() === "number" ? "number" : "bullet";
  }

  return "paragraph";
}

function selectionLinkUrl(selection: BaseSelection | null): string {
  if (!$isRangeSelection(selection)) return "";

  let node: LexicalNode | null = selection.anchor.getNode();

  while (node && !$isRootNode(node)) {
    if ($isLinkNode(node)) return node.getURL();
    node = node.getParent();
  }

  return "";
}

function NodeIdentityPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const cleanups = [
      editor.registerNodeTransform(ParagraphNode, (node) => {
        $ensureSmartMedContentId(node);
      }),
      editor.registerNodeTransform(HeadingNode, (node) => {
        $ensureSmartMedContentId(node);
      }),
      editor.registerNodeTransform(QuoteNode, (node) => {
        $ensureSmartMedContentId(node);
      }),
      editor.registerNodeTransform(ListNode, (node) => {
        $ensureSmartMedContentId(node);
      }),
      editor.registerNodeTransform(ListItemNode, (node) => {
        $ensureSmartMedContentId(node);
      }),
    ];

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [editor]);

  return null;
}

function EditablePlugin({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  return null;
}

function DocumentChangePlugin({
  documentRef,
  onChange,
  onError,
  onValidityChange,
}: {
  documentRef: { current: ContentDocument };
  onChange: (document: ContentDocument) => void;
  onError: (message: string | null) => void;
  onValidityChange?: (valid: boolean, message?: string) => void;
}) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      const candidate = lexicalStateToContentDocument(
        editorState.toJSON(),
        documentRef.current,
      );
      const parsed = safeParseContentDocument(candidate);

      if (!parsed.success) {
        const message =
          parsed.error.issues[0]?.message ??
          "Documentul conține un element care trebuie corectat.";
        onError(message);
        onValidityChange?.(false, message);
        return;
      }

      const canonicalDocument = parsed.data as ContentDocument;
      const changed =
        JSON.stringify(canonicalDocument) !==
        JSON.stringify(documentRef.current);

      documentRef.current = canonicalDocument;
      onError(null);
      onValidityChange?.(true);

      if (changed) {
        onChange(canonicalDocument);
      }
    },
    [documentRef, onChange, onError, onValidityChange],
  );

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={handleChange}
    />
  );
}

function EditorDialog({
  children,
  description,
  onClose,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  onClose: () => void;
  title: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => !element.hidden);

    const preferredFocus = dialog?.querySelector<HTMLElement>(
      "[data-dialog-initial-focus]",
    );
    preferredFocus?.focus();
    if (!preferredFocus) focusable()[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid items-end bg-smart-abyss/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[95dvh] w-full overflow-y-auto rounded-t-[2rem] bg-smart-cream shadow-2xl sm:max-w-2xl sm:rounded-[2rem]"
        ref={dialogRef}
        role="dialog"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-smart-abyss/10 bg-smart-cream/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <h3
              className="font-serif text-2xl font-semibold text-smart-ink"
              id={titleId}
            >
              {title}
            </h3>
            {description ? (
              <p
                className="mt-1 text-sm leading-6 text-smart-ink/60"
                id={descriptionId}
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Închide fereastra"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl text-smart-ink/60 transition hover:bg-smart-abyss/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-smart-teal"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function DialogActions({
  busy = false,
  confirmLabel,
  disabled = false,
  onCancel,
  onConfirm,
}: {
  busy?: boolean;
  confirmLabel: string;
  disabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-2 border-t border-smart-abyss/10 pt-5 sm:flex-row sm:justify-end">
      <button
        className="min-h-12 rounded-xl border border-smart-abyss/15 bg-white px-5 text-sm font-bold text-smart-ink transition hover:border-smart-teal disabled:opacity-40"
        disabled={busy}
        onClick={onCancel}
        type="button"
      >
        Renunță
      </button>
      <button
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-smart-dark px-5 text-sm font-bold text-white transition hover:bg-smart-teal disabled:cursor-not-allowed disabled:opacity-40"
        disabled={disabled || busy}
        onClick={onConfirm}
        type="button"
      >
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        {busy ? "Se încarcă…" : confirmLabel}
      </button>
    </div>
  );
}

function ImageDialog({
  onCancel,
  onInsert,
}: {
  onCancel: () => void;
  onInsert: (block: ImageBlock) => void;
}) {
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [credit, setCredit] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rights, setRights] = useState("");
  const [source, setSource] = useState("");
  const [uploading, setUploading] = useState(false);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  async function uploadAndInsert() {
    if (!file) {
      setError("Alege o imagine.");
      return;
    }

    if (caption.trim().length === 0) {
      setError("Completează titlul imaginii.");
      return;
    }

    if (!decorative && alt.trim().length === 0) {
      setError("Descrie pe scurt ce se vede în imagine.");
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", caption.trim());
    formData.set("altText", decorative ? "" : alt.trim());
    formData.set("decorative", String(decorative));
    formData.set("caption", caption.trim());
    if (credit.trim()) formData.set("credit", credit.trim());
    if (source.trim()) formData.set("source", source.trim());
    if (rights.trim()) formData.set("rights", rights.trim());

    try {
      const response = await fetch("/admin/api/media", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: {
          altText?: string | null;
          caption?: string | null;
          decorative?: boolean;
          id?: number;
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
        setError(payload.message ?? "Imaginea nu a putut fi încărcată.");
        return;
      }

      onInsert({
        alt: payload.data?.altText ?? (decorative ? "" : alt.trim()),
        caption: payload.data?.caption ?? caption.trim(),
        ...(credit.trim() ? { credit: credit.trim() } : {}),
        decorative: payload.data?.decorative ?? decorative,
        id: crypto.randomUUID(),
        mediaId: mediaId ?? 0,
        ...(rights.trim() ? { rights: rights.trim() } : {}),
        ...(source.trim() ? { source: source.trim() } : {}),
        type: "image",
      });
    } catch {
      setError("Imaginea nu a putut fi încărcată. Încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <EditorDialog
      description="Imaginea va fi inserată exact în locul în care ai lăsat cursorul."
      onClose={onCancel}
      title="Adaugă o imagine"
    >
      <div className="grid gap-5">
        <label className="grid cursor-pointer gap-3 rounded-2xl border border-dashed border-smart-teal/35 bg-white/65 p-4 text-center transition hover:border-smart-teal focus-within:border-smart-teal focus-within:ring-2 focus-within:ring-smart-aqua/30">
          {previewUrl ? (
            // A local object URL is intentionally rendered without image optimization.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="mx-auto max-h-64 w-full rounded-xl object-contain"
              src={previewUrl}
            />
          ) : (
            <span className="grid min-h-40 place-items-center rounded-xl bg-smart-abyss/5">
              <span>
                <ImagePlus
                  aria-hidden="true"
                  className="mx-auto size-8 text-smart-teal"
                />
                <span className="mt-3 block text-sm font-bold text-smart-ink">
                  Alege o imagine
                </span>
                <span className="mt-1 block text-xs text-smart-ink/50">
                  JPG, PNG sau WebP
                </span>
              </span>
            </span>
          )}
          <input
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            data-dialog-initial-focus
            disabled={uploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
            type="file"
          />
          {file ? (
            <span className="text-sm font-semibold text-smart-teal">
              {file.name} · apasă aici pentru a schimba
            </span>
          ) : null}
        </label>

        <label className="grid gap-2 text-sm font-bold text-smart-ink">
          <span>
            Titlul imaginii <span aria-hidden="true">*</span>
          </span>
          <input
            aria-invalid={Boolean(error) && caption.trim().length === 0}
            className={dialogFieldClass}
            disabled={uploading}
            maxLength={500}
            onChange={(event) => {
              setCaption(event.target.value);
              setError(null);
            }}
            placeholder="Ex.: Structura unui neuron"
            value={caption}
          />
          <span className="text-xs font-normal leading-5 text-smart-ink/50">
            Acest titlu va apărea discret sub imagine în articol.
          </span>
        </label>

        <label className="grid gap-2 text-sm font-bold text-smart-ink">
          Descriere imagine {!decorative ? <span aria-hidden="true">*</span> : null}
          <input
            aria-invalid={
              Boolean(error) && !decorative && alt.trim().length === 0
            }
            className={dialogFieldClass}
            disabled={decorative || uploading}
            maxLength={500}
            onChange={(event) => {
              setAlt(event.target.value);
              setError(null);
            }}
            placeholder="Ex.: Student care învață la un laptop"
            value={alt}
          />
          <span className="text-xs font-normal leading-5 text-smart-ink/50">
            Această descriere ajută persoanele care nu pot vedea imaginea.
          </span>
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-smart-abyss/12 bg-white px-4 text-sm font-bold text-smart-ink">
          <input
            checked={decorative}
            disabled={uploading}
            onChange={(event) => {
              setDecorative(event.target.checked);
              setError(null);
            }}
            type="checkbox"
          />
          Imagine doar decorativă
        </label>

        <details className="rounded-2xl border border-smart-abyss/10 bg-white/55 p-4">
          <summary className="cursor-pointer list-none text-sm font-bold text-smart-ink/65 marker:hidden">
            Credit și sursă (opțional)
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(
              [
                ["credit", "Credit foto", credit, setCredit],
                ["source", "Sursă HTTPS", source, setSource],
                ["rights", "Drepturi", rights, setRights],
              ] as const
            ).map(([name, label, value, setter]) => (
              <label
                className="grid gap-2 text-sm font-bold text-smart-ink"
                key={name}
              >
                {label}
                <input
                  className={dialogFieldClass}
                  disabled={uploading}
                  maxLength={name === "source" ? 2048 : 500}
                  onChange={(event) => setter(event.target.value)}
                  value={value}
                />
              </label>
            ))}
          </div>
        </details>

        {error ? (
          <p
            aria-live="assertive"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            {error}
          </p>
        ) : null}
      </div>

      <DialogActions
        busy={uploading}
        confirmLabel="Încarcă și inserează"
        onCancel={onCancel}
        onConfirm={() => void uploadAndInsert()}
      />
    </EditorDialog>
  );
}

function YouTubeDialog({
  onCancel,
  onInsert,
}: {
  onCancel: () => void;
  onInsert: (block: YouTubeBlock) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  function insert() {
    const videoId = parseYouTubeVideoId(url);

    if (!videoId) {
      setError("Introdu un link YouTube valid.");
      return;
    }

    if (!title.trim()) {
      setError("Completează titlul videoclipului.");
      return;
    }

    onInsert({
      id: crypto.randomUUID(),
      ...(summary.trim() ? { summary: summary.trim() } : {}),
      title: title.trim(),
      type: "youtube",
      videoId,
    });
  }

  return (
    <EditorDialog
      description="Lipește linkul obișnuit al videoclipului; nu ai nevoie de cod embed."
      onClose={onCancel}
      title="Adaugă un video YouTube"
    >
      <div className="grid gap-5">
        <div className="grid aspect-video place-items-center rounded-2xl bg-smart-abyss text-center text-white">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/12">
              <Play
                aria-hidden="true"
                className="ml-1 size-6"
                fill="currentColor"
              />
            </span>
            <p className="mt-3 text-sm font-semibold text-white/65">
              Videoclipul va fi afișat aici în articol
            </p>
          </div>
        </div>

        <label className="grid gap-2 text-sm font-bold text-smart-ink">
          Link YouTube <span aria-hidden="true">*</span>
          <input
            aria-invalid={Boolean(error) && !parseYouTubeVideoId(url)}
            className={dialogFieldClass}
            data-dialog-initial-focus
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-smart-ink">
          <span>
            Titlul videoclipului <span aria-hidden="true">*</span>
          </span>
          <input
            aria-invalid={Boolean(error) && title.trim().length === 0}
            className={dialogFieldClass}
            maxLength={200}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
            }}
            placeholder="Un titlu clar pentru cititori"
            value={title}
          />
          <span className="text-xs font-normal leading-5 text-smart-ink/50">
            Apare discret sub videoclip și este folosit de tehnologiile de
            accesibilitate.
          </span>
        </label>

        <details className="rounded-2xl border border-smart-abyss/10 bg-white/55 p-4">
          <summary className="cursor-pointer list-none text-sm font-bold text-smart-ink/65 marker:hidden">
            Adaugă un rezumat (opțional)
          </summary>
          <label className="mt-4 grid gap-2 text-sm font-bold text-smart-ink">
            Rezumat
            <textarea
              className={`${dialogFieldClass} min-h-28 resize-y`}
              maxLength={500}
              onChange={(event) => setSummary(event.target.value)}
              value={summary}
            />
          </label>
        </details>

        {error ? (
          <p
            aria-live="assertive"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
          >
            <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      <DialogActions
        confirmLabel="Inserează videoclipul"
        onCancel={onCancel}
        onConfirm={insert}
      />
    </EditorDialog>
  );
}

function LinkDialog({
  initialUrl,
  onApply,
  onCancel,
}: {
  initialUrl: string;
  onApply: (url: string) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState(initialUrl);

  function apply() {
    const href = normalizeContentHref(url);

    if (!href) {
      setError("Linkul trebuie să fie intern sau să folosească HTTPS.");
      return;
    }

    onApply(href);
  }

  return (
    <EditorDialog
      description="Selectează textul din document, apoi adaugă destinația."
      onClose={onCancel}
      title={initialUrl ? "Modifică linkul" : "Adaugă un link"}
    >
      <label className="grid gap-2 text-sm font-bold text-smart-ink">
        Adresa linkului
        <input
          aria-invalid={Boolean(error)}
          className={dialogFieldClass}
          data-dialog-initial-focus
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
          placeholder="/pagina-interna sau https://..."
          value={url}
        />
      </label>
      {error ? (
        <p
          aria-live="assertive"
          className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"
        >
          <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}
      <DialogActions
        confirmLabel="Aplică linkul"
        disabled={!url.trim()}
        onCancel={onCancel}
        onConfirm={apply}
      />
    </EditorDialog>
  );
}

function DocumentToolbar({ disabled }: { disabled: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [activeDialog, setActiveDialog] = useState<EditorDialogType | null>(
    null,
  );
  const [blockStyle, setBlockStyle] = useState<BlockStyle>("paragraph");
  const [canRedo, setCanRedo] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const savedSelection = useRef<BaseSelection | null>(null);

  const updateToolbar = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      const selection = $getSelection();
      setBlockStyle(selectionBlockStyle(selection));
      setLinkUrl(selectionLinkUrl(selection));

      if ($isRangeSelection(selection)) {
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
      } else {
        setIsBold(false);
        setIsItalic(false);
      }
    });
  }, []);

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        updateToolbar(editorState);
      }),
    [editor, updateToolbar],
  );

  useEffect(() => {
    const cleanups = [
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar(editor.getEditorState());
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    ];

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [editor, updateToolbar]);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    requestAnimationFrame(() => editor.focus());
  }, [editor]);

  function rememberSelectionAndOpen(dialog: EditorDialogType) {
    editor.getEditorState().read(() => {
      savedSelection.current = $getSelection()?.clone() ?? null;
    });
    setActiveDialog(dialog);
  }

  function restoreSelection() {
    const selection = savedSelection.current;
    if (selection) $setSelection(selection.clone());
  }

  function focusDocument() {
    requestAnimationFrame(() => editor.focus());
  }

  function formatBlock(nextStyle: Exclude<BlockStyle, "bullet" | "number">) {
    if (blockStyle === "bullet" || blockStyle === "number") {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }

    editor.update(() => {
      const selection = $getSelection();
      const createBlock: () => ElementNode =
        nextStyle === "h2"
          ? () => $createHeadingNode("h2")
          : nextStyle === "h3"
            ? () => $createHeadingNode("h3")
            : nextStyle === "quote"
              ? () => $createQuoteNode()
              : () => $createParagraphNode();

      $setBlocksType<ElementNode>(
        selection,
        createBlock,
        (previousNode, nextNode) => {
        $copyBlockFormatIndent(previousNode, nextNode);
        $copySmartMedContentId(previousNode, nextNode);
        },
      );
    });
    requestAnimationFrame(() => editor.focus());
  }

  function toggleList(type: "bullet" | "number") {
    const isActive = blockStyle === type;
    editor.dispatchCommand(
      isActive
        ? REMOVE_LIST_COMMAND
        : type === "number"
          ? INSERT_ORDERED_LIST_COMMAND
          : INSERT_UNORDERED_LIST_COMMAND,
      undefined,
    );
  }

  function applyLink(url: string) {
    editor.update(
      () => {
        restoreSelection();
      },
      { discrete: true },
    );
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    closeDialog();
    focusDocument();
  }

  function removeLink() {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
  }

  function insertImage(block: ImageBlock) {
    editor.update(() => {
      restoreSelection();
      $insertNodeToNearestRoot($createSmartMedImageNode(block));
    });
    closeDialog();
    focusDocument();
  }

  function insertYouTube(block: YouTubeBlock) {
    editor.update(() => {
      restoreSelection();
      $insertNodeToNearestRoot($createSmartMedYouTubeNode(block));
    });
    closeDialog();
    focusDocument();
  }

  return (
    <>
      <div
        aria-label="Instrumente pentru editarea articolului"
        className="sticky top-0 z-30 border-b border-smart-abyss/10 bg-smart-cream/95 px-2 py-2 backdrop-blur"
        role="toolbar"
      >
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]">
          <label className="sr-only" htmlFor="document-block-style">
            Stilul paragrafului
          </label>
          <select
            aria-label="Stilul textului"
            className="min-h-11 w-[12.5rem] shrink-0 rounded-xl border border-smart-abyss/12 bg-white px-3 text-sm font-bold text-smart-ink outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25 disabled:opacity-40"
            disabled={disabled}
            id="document-block-style"
            onChange={(event) =>
              formatBlock(
                event.target.value as Exclude<
                  BlockStyle,
                  "bullet" | "number"
                >,
              )
            }
            value={
              blockStyle === "bullet" || blockStyle === "number"
                ? "paragraph"
                : blockStyle
            }
          >
            <option value="paragraph">Text normal</option>
            <option value="h2">Titlu 1 · secțiune</option>
            <option value="h3">Titlu 2 · subsecțiune</option>
            <option value="quote">Citat</option>
          </select>

          <span
            aria-hidden="true"
            className="mx-1 h-7 w-px shrink-0 bg-smart-abyss/10"
          />
          <ToolbarButton
            active={isBold}
            disabled={disabled}
            label="Aldin"
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
            }
          >
            <Bold aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={isItalic}
            disabled={disabled}
            label="Cursiv"
            onClick={() =>
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
            }
          >
            <Italic aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={Boolean(linkUrl)}
            disabled={disabled}
            label={linkUrl ? "Modifică linkul" : "Adaugă un link"}
            onClick={() => rememberSelectionAndOpen("link")}
          >
            <Link2 aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled || !linkUrl}
            label="Elimină linkul"
            onClick={removeLink}
          >
            <Unlink aria-hidden="true" className="size-4" />
          </ToolbarButton>

          <span
            aria-hidden="true"
            className="mx-1 h-7 w-px shrink-0 bg-smart-abyss/10"
          />
          <ToolbarButton
            active={blockStyle === "bullet"}
            disabled={disabled}
            label="Listă cu marcatori"
            onClick={() => toggleList("bullet")}
          >
            <ListIcon aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            active={blockStyle === "number"}
            disabled={disabled}
            label="Listă numerotată"
            onClick={() => toggleList("number")}
          >
            <ListOrdered aria-hidden="true" className="size-4" />
          </ToolbarButton>

          <span
            aria-hidden="true"
            className="mx-1 h-7 w-px shrink-0 bg-smart-abyss/10"
          />
          <ToolbarButton
            disabled={disabled}
            label="Adaugă o imagine"
            onClick={() => rememberSelectionAndOpen("image")}
            wide
          >
            <ImagePlus aria-hidden="true" className="size-4" />
            Imagine
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled}
            label="Adaugă un video YouTube"
            onClick={() => rememberSelectionAndOpen("youtube")}
            wide
          >
            <Video aria-hidden="true" className="size-4" />
            YouTube
          </ToolbarButton>

          <span
            aria-hidden="true"
            className="mx-1 h-7 w-px shrink-0 bg-smart-abyss/10"
          />
          <ToolbarButton
            disabled={disabled || !canUndo}
            label="Anulează ultima modificare"
            onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          >
            <Undo2 aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            disabled={disabled || !canRedo}
            label="Refă modificarea"
            onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          >
            <Redo2 aria-hidden="true" className="size-4" />
          </ToolbarButton>
        </div>
      </div>

      {activeDialog === "image" ? (
        <ImageDialog onCancel={closeDialog} onInsert={insertImage} />
      ) : activeDialog === "youtube" ? (
        <YouTubeDialog onCancel={closeDialog} onInsert={insertYouTube} />
      ) : activeDialog === "link" ? (
        <LinkDialog
          initialUrl={linkUrl}
          onApply={applyLink}
          onCancel={closeDialog}
        />
      ) : null}
    </>
  );
}

export function ContentBlockEditor({
  disabled = false,
  document,
  onChange,
  onValidityChange,
}: ContentBlockEditorProps) {
  const documentRef = useRef(document);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [initialConfig] = useState(() => ({
    editable: !disabled,
    editorState: JSON.stringify(contentDocumentToLexicalState(document)),
    namespace: `smartmed-document-${crypto.randomUUID()}`,
    nodes: approvedSmartMedLexicalNodes,
    onError(error: Error) {
      throw error;
    },
    theme: {
      heading: {
        h2: "mb-4 mt-10 font-serif text-4xl font-semibold leading-[1.05] text-smart-ink first:mt-0 sm:text-5xl",
        h3: "mb-3 mt-8 font-serif text-3xl font-semibold leading-tight text-smart-ink sm:text-4xl",
      },
      link: "text-smart-teal underline decoration-smart-aqua/60 underline-offset-2",
      list: {
        listitem: "my-2 pl-1",
        ol: "my-5 list-decimal space-y-2 pl-7",
        ul: "my-5 list-disc space-y-2 pl-7",
      },
      paragraph: "my-4 min-h-7",
      quote:
        "my-7 border-l-4 border-smart-teal/45 pl-5 font-serif text-2xl italic leading-relaxed text-smart-ink",
      text: {
        bold: "font-bold",
        italic: "italic",
      },
    },
  }));

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    onValidityChange?.(true);
  }, [onValidityChange]);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-smart-abyss/12 bg-white shadow-[0_18px_55px_rgba(3,17,28,0.09)]">
      <LexicalComposer initialConfig={initialConfig}>
        <DocumentToolbar disabled={disabled} />
        <div className="relative bg-white">
          <RichTextPlugin
            ErrorBoundary={LexicalErrorBoundary}
            contentEditable={
              <ContentEditable
                aria-label="Conținutul articolului"
                className="mx-auto min-h-[36rem] w-full max-w-[54rem] px-5 py-10 text-[1.0625rem] leading-8 text-smart-ink outline-none sm:px-10 sm:py-14"
              />
            }
            placeholder={
              <span className="pointer-events-none absolute inset-x-0 top-10 mx-auto w-full max-w-[54rem] px-5 text-[1.0625rem] leading-8 text-smart-ink/35 sm:top-14 sm:px-10">
                Începe să scrii articolul…
              </span>
            }
          />
        </div>
        <HistoryPlugin />
        <LinkPlugin
          validateUrl={(url) => normalizeContentHref(url) !== null}
        />
        <ListPlugin />
        <NodeIdentityPlugin />
        <EditablePlugin disabled={disabled} />
        <DocumentChangePlugin
          documentRef={documentRef}
          onChange={onChange}
          onError={setEditorError}
          onValidityChange={onValidityChange}
        />
      </LexicalComposer>

      <div className="border-t border-smart-abyss/8 bg-smart-cream/55 px-5 py-3 sm:px-6">
        {editorError ? (
          <p
            aria-live="assertive"
            className="flex items-start gap-2 text-sm font-semibold text-red-700"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            {editorError}
          </p>
        ) : (
          <p className="text-xs leading-5 text-smart-ink/52">
            Scrie continuu ca într-un document. Enter începe un paragraf nou,
            iar titlul mare al articolului (H1) este cel completat în pasul
            anterior.
          </p>
        )}
      </div>
    </div>
  );
}
