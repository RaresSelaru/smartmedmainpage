"use client";

import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import {
  AlertCircle,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { InlineLexicalEditor } from "@/components/admin/inline-lexical-editor";
import { buildYouTubeUrl, parseYouTubeVideoId } from "@/lib/admin/youtube";
import type {
  CalloutBlock,
  ImageBlock,
  ReferencesBlock,
  YouTubeBlock,
} from "@/lib/content/types";

export type StructuredContentBlock =
  | CalloutBlock
  | ImageBlock
  | ReferencesBlock
  | YouTubeBlock;

type StructuredContentNodeCardProps = {
  block: StructuredContentBlock;
  onChange: (block: StructuredContentBlock) => void;
  onRemove: () => void;
};

const fieldClass =
  "min-h-11 w-full rounded-xl border border-smart-abyss/12 bg-white px-3 py-2 text-base text-smart-ink outline-none transition focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25 disabled:cursor-not-allowed disabled:bg-smart-cream/70";

const compactFieldClass =
  "min-h-10 w-full rounded-xl border border-smart-abyss/12 bg-white px-3 py-2 text-sm text-smart-ink outline-none transition focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25 disabled:cursor-not-allowed disabled:bg-smart-cream/70";

function CardShell({
  block,
  children,
  disabled,
  onRemove,
}: {
  block: StructuredContentBlock;
  children: React.ReactNode;
  disabled: boolean;
  onRemove: () => void;
}) {
  const labels: Record<StructuredContentBlock["type"], string> = {
    callout: "Casetă informativă",
    image: "Imagine",
    references: "Referințe",
    youtube: "Video YouTube",
  };

  return (
    <section
      aria-label={`${labels[block.type]} inserat în articol`}
      className="group my-7 overflow-hidden rounded-3xl border border-smart-teal/20 bg-smart-cream/55 shadow-sm"
      contentEditable={false}
      data-smartmed-structured-block={block.type}
    >
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-smart-abyss/8 bg-white/80 px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="size-2 rounded-full bg-smart-teal"
          />
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-smart-teal">
            {labels[block.type]}
          </p>
        </div>
        <button
          aria-label={`Elimină ${labels[block.type].toLocaleLowerCase("ro")}`}
          className="flex size-11 items-center justify-center rounded-xl text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-35"
          disabled={disabled}
          onClick={onRemove}
          title="Elimină din articol"
          type="button"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ImageCard({
  block,
  disabled,
  onChange,
}: {
  block: ImageBlock;
  disabled: boolean;
  onChange: (block: ImageBlock) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function setField<Key extends keyof ImageBlock>(
    field: Key,
    value: ImageBlock[Key],
  ) {
    onChange({ ...block, [field]: value });
  }

  async function replaceImage(file: File) {
    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", block.caption?.trim() || file.name);
    formData.set("altText", block.decorative ? "" : block.alt.trim());
    formData.set("decorative", String(block.decorative));
    if (block.caption) formData.set("caption", block.caption);
    if (block.credit) formData.set("credit", block.credit);
    if (block.source) formData.set("source", block.source);
    if (block.rights) formData.set("rights", block.rights);

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
        setMessage(payload.message ?? "Imaginea nu a putut fi încărcată.");
        return;
      }

      onChange({
        ...block,
        alt: payload.data?.altText ?? block.alt,
        caption: payload.data?.caption ?? block.caption,
        decorative: payload.data?.decorative ?? block.decorative,
        mediaId: mediaId ?? block.mediaId,
      });
      setMessage("Imaginea a fost înlocuită.");
    } catch {
      setMessage("Imaginea nu a putut fi încărcată. Încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-smart-abyss/8">
        <Image
          alt={block.decorative ? "" : block.alt}
          className="h-full w-full object-cover"
          height={720}
          src={`/admin/media/${block.mediaId}/1280`}
          unoptimized
          width={1280}
        />
      </div>

      <label className="grid gap-2 text-sm font-bold text-smart-ink">
        Titlul imaginii
        <input
          aria-invalid={(block.caption?.trim().length ?? 0) === 0}
          className={fieldClass}
          disabled={disabled}
          maxLength={500}
          onChange={(event) =>
            setField("caption", event.target.value || undefined)
          }
          placeholder="Ex.: Structura unui neuron"
          value={block.caption ?? ""}
        />
        {(block.caption?.trim().length ?? 0) === 0 ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertCircle aria-hidden="true" className="size-3.5" />
            Adaugă titlul care va apărea sub imagine.
          </span>
        ) : (
          <span className="text-xs font-normal leading-5 text-smart-ink/50">
            Apare discret sub imagine în articol.
          </span>
        )}
      </label>

      <label className="grid gap-2 text-sm font-bold text-smart-ink">
        Descriere imagine
        <input
          aria-invalid={!block.decorative && block.alt.trim().length === 0}
          className={fieldClass}
          disabled={disabled || block.decorative}
          maxLength={500}
          onChange={(event) => setField("alt", event.target.value)}
          placeholder="Descrie pe scurt ce se vede"
          value={block.alt}
        />
        {!block.decorative && block.alt.trim().length === 0 ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertCircle aria-hidden="true" className="size-3.5" />
            Descrierea este obligatorie.
          </span>
        ) : null}
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-smart-teal/25 bg-white px-4 py-2 text-sm font-bold text-smart-teal transition hover:border-smart-teal disabled:opacity-40">
          <Upload aria-hidden="true" className="size-4" />
          {uploading ? "Se încarcă…" : "Înlocuiește imaginea"}
          <input
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void replaceImage(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        {message ? (
          <span aria-live="polite" className="text-sm text-smart-ink/60">
            {message}
          </span>
        ) : null}
      </div>

      <details className="rounded-2xl border border-smart-abyss/10 bg-white/65 p-3">
        <summary className="cursor-pointer list-none text-sm font-bold text-smart-ink/65 marker:hidden">
          Credit și opțiuni
        </summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-smart-abyss/10 bg-white px-3 text-sm font-bold sm:col-span-2">
            <input
              checked={block.decorative}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...block,
                  alt: event.target.checked ? "" : block.alt,
                  decorative: event.target.checked,
                })
              }
              type="checkbox"
            />
            Imagine exclusiv decorativă
          </label>
          {(["credit", "source", "rights"] as const).map(
            (field) => (
              <label
                className="grid gap-2 text-sm font-bold text-smart-ink"
                key={field}
              >
                {{
                  credit: "Credit",
                  rights: "Drepturi",
                  source: "Sursă HTTPS",
                }[field]}
                <input
                  className={compactFieldClass}
                  disabled={disabled}
                  maxLength={field === "source" ? 2048 : 500}
                  onChange={(event) =>
                    setField(field, event.target.value || undefined)
                  }
                  value={block[field] ?? ""}
                />
              </label>
            ),
          )}
        </div>
      </details>
    </div>
  );
}

function YouTubeCard({
  block,
  disabled,
  onChange,
}: {
  block: YouTubeBlock;
  disabled: boolean;
  onChange: (block: YouTubeBlock) => void;
}) {
  const [url, setUrl] = useState(buildYouTubeUrl(block.videoId));
  const [urlError, setUrlError] = useState<string | null>(null);

  function commitUrl() {
    const videoId = parseYouTubeVideoId(url);

    if (!videoId) {
      setUrlError("Introdu un link YouTube valid.");
      return;
    }

    setUrlError(null);
    onChange({ ...block, videoId });
  }

  return (
    <div className="grid gap-4">
      <div className="grid aspect-video place-items-center rounded-2xl bg-smart-abyss px-6 text-center text-white">
        <div>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/12">
            <Play aria-hidden="true" className="ml-1 size-6" fill="currentColor" />
          </span>
          <p className="mt-4 font-serif text-2xl font-semibold">
            {block.title || "Video YouTube"}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/55">
            Previzualizarea video apare pe pagina articolului
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-smart-ink sm:col-span-2">
          Link YouTube
          <input
            aria-invalid={Boolean(urlError)}
            className={fieldClass}
            disabled={disabled}
            onBlur={commitUrl}
            onChange={(event) => {
              setUrl(event.target.value);
              setUrlError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitUrl();
              }
            }}
            value={url}
          />
          {urlError ? (
            <span className="text-xs font-semibold text-red-700">
              {urlError}
            </span>
          ) : null}
        </label>
        <label className="grid gap-2 text-sm font-bold text-smart-ink sm:col-span-2">
          Titlul videoclipului
          <input
            aria-invalid={block.title.trim().length === 0}
            className={fieldClass}
            disabled={disabled}
            maxLength={200}
            onChange={(event) =>
              onChange({ ...block, title: event.target.value })
            }
            placeholder="Un titlu clar pentru cititori"
            value={block.title}
          />
          <span className="text-xs font-normal leading-5 text-smart-ink/50">
            Apare discret sub videoclip în articol.
          </span>
        </label>
        <label className="grid gap-2 text-sm font-bold text-smart-ink sm:col-span-2">
          Rezumat opțional
          <textarea
            className={`${fieldClass} min-h-24 resize-y`}
            disabled={disabled}
            maxLength={500}
            onChange={(event) =>
              onChange({
                ...block,
                summary: event.target.value || undefined,
              })
            }
            value={block.summary ?? ""}
          />
        </label>
      </div>
    </div>
  );
}

function CalloutCard({
  block,
  disabled,
  onChange,
}: {
  block: CalloutBlock;
  disabled: boolean;
  onChange: (block: CalloutBlock) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-smart-ink">
          Tipul casetei
          <select
            className={fieldClass}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...block,
                variant: event.target.value as CalloutBlock["variant"],
              })
            }
            value={block.variant}
          >
            <option value="important">Important</option>
            <option value="warning">Atenție</option>
            <option value="medical-note">Notă medicală</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-smart-ink">
          Titlu opțional
          <input
            className={fieldClass}
            disabled={disabled}
            maxLength={200}
            onChange={(event) =>
              onChange({
                ...block,
                title: event.target.value || undefined,
              })
            }
            value={block.title ?? ""}
          />
        </label>
      </div>
      <InlineLexicalEditor
        content={block.content}
        disabled={disabled}
        label="Conținutul casetei"
        namespace={`callout-${block.id}`}
        onChange={(content) => onChange({ ...block, content })}
        placeholder="Scrie mesajul casetei…"
      />
    </div>
  );
}

function ReferencesCard({
  block,
  disabled,
  onChange,
}: {
  block: ReferencesBlock;
  disabled: boolean;
  onChange: (block: ReferencesBlock) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-smart-ink">
        Titlu
        <input
          className={fieldClass}
          disabled={disabled}
          maxLength={200}
          onChange={(event) =>
            onChange({ ...block, title: event.target.value || undefined })
          }
          value={block.title ?? ""}
        />
      </label>

      {block.items.map((item, index) => (
        <div
          className="grid gap-3 rounded-2xl border border-smart-abyss/10 bg-white/75 p-3 sm:grid-cols-[1fr_1fr_auto]"
          key={item.id}
        >
          <label className="grid gap-1.5 text-xs font-bold text-smart-ink">
            Referința {index + 1}
            <input
              className={compactFieldClass}
              disabled={disabled}
              maxLength={1000}
              onChange={(event) =>
                onChange({
                  ...block,
                  items: block.items.map((candidate) =>
                    candidate.id === item.id
                      ? { ...candidate, label: event.target.value }
                      : candidate,
                  ),
                })
              }
              value={item.label}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-smart-ink">
            Link opțional
            <input
              className={compactFieldClass}
              disabled={disabled}
              maxLength={2048}
              onChange={(event) =>
                onChange({
                  ...block,
                  items: block.items.map((candidate) =>
                    candidate.id === item.id
                      ? { ...candidate, url: event.target.value || undefined }
                      : candidate,
                  ),
                })
              }
              value={item.url ?? ""}
            />
          </label>
          <button
            aria-label={`Elimină referința ${index + 1}`}
            className="flex size-11 self-end items-center justify-center rounded-xl text-red-700 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-30"
            disabled={disabled || block.items.length === 1}
            onClick={() =>
              onChange({
                ...block,
                items: block.items.filter(
                  (candidate) => candidate.id !== item.id,
                ),
              })
            }
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}

      <button
        className="flex min-h-11 w-fit items-center gap-2 rounded-xl border border-smart-teal/25 bg-white px-4 py-2 text-sm font-bold text-smart-teal transition hover:border-smart-teal disabled:opacity-35"
        disabled={disabled || block.items.length >= 100}
        onClick={() =>
          onChange({
            ...block,
            items: [...block.items, { id: crypto.randomUUID(), label: "" }],
          })
        }
        type="button"
      >
        <Plus aria-hidden="true" className="size-4" />
        Adaugă referință
      </button>
    </div>
  );
}

export function StructuredContentNodeCard({
  block,
  onChange,
  onRemove,
}: StructuredContentNodeCardProps) {
  const editable = useLexicalEditable();
  const disabled = !editable;

  return (
    <CardShell
      block={block}
      disabled={disabled}
      onRemove={onRemove}
    >
      {block.type === "image" ? (
        <ImageCard
          block={block}
          disabled={disabled}
          onChange={onChange}
        />
      ) : block.type === "youtube" ? (
        <YouTubeCard
          block={block}
          disabled={disabled}
          key={block.videoId}
          onChange={onChange}
        />
      ) : block.type === "callout" ? (
        <CalloutCard
          block={block}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <ReferencesCard
          block={block}
          disabled={disabled}
          onChange={onChange}
        />
      )}
    </CardShell>
  );
}
