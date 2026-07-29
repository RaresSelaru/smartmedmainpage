"use client";

import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { InlineLexicalEditor } from "@/components/admin/inline-lexical-editor";
import type {
  CalloutBlock,
  ContentBlock,
  ContentDocument,
  ContentInline,
  ImageBlock,
  ListBlock,
  ReferencesBlock,
} from "@/lib/content/types";

type ContentBlockEditorProps = {
  disabled?: boolean;
  document: ContentDocument;
  onChange: (document: ContentDocument) => void;
};

type AddableBlockType =
  | "blockquote"
  | "callout"
  | "heading-2"
  | "heading-3"
  | "image"
  | "list"
  | "paragraph"
  | "references"
  | "youtube";

const fieldClass =
  "min-h-11 w-full rounded-xl border border-smart-abyss/12 bg-white px-3 py-2 text-sm outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/25 disabled:bg-smart-cream/70";

function newId() {
  return crypto.randomUUID();
}

function newTextContent(): ContentInline[] {
  return [{ type: "text", text: "" }];
}

function createBlock(type: AddableBlockType): ContentBlock {
  if (type === "paragraph") {
    return { content: newTextContent(), id: newId(), type: "paragraph" };
  }
  if (type === "heading-2" || type === "heading-3") {
    return {
      content: newTextContent(),
      id: newId(),
      level: type === "heading-2" ? 2 : 3,
      type: "heading",
    };
  }
  if (type === "blockquote") {
    return { content: newTextContent(), id: newId(), type: "blockquote" };
  }
  if (type === "list") {
    return {
      id: newId(),
      items: [{ content: newTextContent(), id: newId() }],
      style: "unordered",
      type: "list",
    };
  }
  if (type === "image") {
    return {
      alt: "",
      decorative: false,
      id: newId(),
      mediaId: 0,
      type: "image",
    };
  }
  if (type === "youtube") {
    return { id: newId(), title: "", type: "youtube", videoId: "" };
  }
  if (type === "callout") {
    return {
      content: newTextContent(),
      id: newId(),
      type: "callout",
      variant: "important",
    };
  }

  return {
    id: newId(),
    items: [{ id: newId(), label: "" }],
    title: "Referințe",
    type: "references",
  };
}

function BlockControls({
  disabled,
  index,
  length,
  onMove,
  onRemove,
}: {
  disabled: boolean;
  index: number;
  length: number;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        aria-label="Mută blocul în sus"
        className="flex size-9 items-center justify-center rounded-xl border border-smart-abyss/10 bg-white text-smart-ink/65 disabled:opacity-30"
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
        type="button"
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </button>
      <button
        aria-label="Mută blocul în jos"
        className="flex size-9 items-center justify-center rounded-xl border border-smart-abyss/10 bg-white text-smart-ink/65 disabled:opacity-30"
        disabled={disabled || index === length - 1}
        onClick={() => onMove(1)}
        type="button"
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </button>
      <button
        aria-label="Elimină blocul"
        className="flex size-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-700 disabled:opacity-30"
        disabled={disabled}
        onClick={onRemove}
        type="button"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function TextBlockFields({
  block,
  disabled,
  onChange,
}: {
  block: Extract<ContentBlock, { content: ContentInline[] }>;
  disabled: boolean;
  onChange: (block: ContentBlock) => void;
}) {
  return (
    <InlineLexicalEditor
      content={block.content}
      disabled={disabled}
      label={`Conținut bloc ${block.type}`}
      namespace={block.id}
      onChange={(content) => onChange({ ...block, content })}
    />
  );
}

function ListFields({
  block,
  disabled,
  onChange,
}: {
  block: ListBlock;
  disabled: boolean;
  onChange: (block: ContentBlock) => void;
}) {
  function updateItem(index: number, content: ContentInline[]) {
    onChange({
      ...block,
      items: block.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, content } : item,
      ),
    });
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
        Tip listă
        <select
          className={fieldClass}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...block,
              style:
                event.target.value === "ordered" ? "ordered" : "unordered",
            })
          }
          value={block.style}
        >
          <option value="unordered">Listă cu marcatori</option>
          <option value="ordered">Listă numerotată</option>
        </select>
      </label>
      {block.items.map((item, index) => (
        <div className="grid gap-2" key={item.id}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-smart-teal">
              Element {index + 1}
            </p>
            <button
              className="text-xs font-bold text-red-700 disabled:opacity-40"
              disabled={disabled || block.items.length === 1}
              onClick={() =>
                onChange({
                  ...block,
                  items: block.items.filter((candidate) => candidate.id !== item.id),
                })
              }
              type="button"
            >
              Elimină
            </button>
          </div>
          <InlineLexicalEditor
            content={item.content}
            disabled={disabled}
            label={`Element de listă ${index + 1}`}
            namespace={item.id}
            onChange={(content) => updateItem(index, content)}
          />
        </div>
      ))}
      <button
        className="flex min-h-11 w-fit items-center gap-2 rounded-xl border border-smart-teal/25 bg-white px-4 py-2 text-sm font-bold text-smart-teal disabled:opacity-40"
        disabled={disabled || block.items.length >= 100}
        onClick={() =>
          onChange({
            ...block,
            items: [
              ...block.items,
              { content: newTextContent(), id: newId() },
            ],
          })
        }
        type="button"
      >
        <Plus aria-hidden="true" className="size-4" />
        Adaugă element
      </button>
    </div>
  );
}

function ImageFields({
  block,
  disabled,
  onChange,
}: {
  block: ImageBlock;
  disabled: boolean;
  onChange: (block: ContentBlock) => void;
}) {
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function setField<Key extends keyof ImageBlock>(
    field: Key,
    value: ImageBlock[Key],
  ) {
    onChange({ ...block, [field]: value });
  }

  async function upload(file: File) {
    setUploading(true);
    setUploadMessage(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("title", block.caption?.trim() || file.name);
    formData.set("altText", block.decorative ? "" : block.alt);
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

      if (
        !response.ok ||
        payload.ok !== true ||
        !Number.isSafeInteger(payload.data?.id) ||
        (payload.data?.id ?? 0) <= 0
      ) {
        setUploadMessage(
          payload.message ?? "Imaginea nu a putut fi încărcată.",
        );
        return;
      }

      onChange({
        ...block,
        alt: payload.data?.altText ?? block.alt,
        caption: payload.data?.caption ?? block.caption,
        decorative: payload.data?.decorative ?? block.decorative,
        mediaId: payload.data?.id ?? block.mediaId,
      });
      setUploadMessage(`Imagine încărcată: media #${payload.data?.id}.`);
    } catch {
      setUploadMessage("Imaginea nu a putut fi încărcată.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold">
        ID media
        <input
          className={fieldClass}
          disabled={disabled}
          min={1}
          onChange={(event) => setField("mediaId", Number(event.target.value))}
          type="number"
          value={block.mediaId || ""}
        />
      </label>
      <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-smart-abyss/12 bg-white px-3 py-2 text-sm font-bold">
        <input
          checked={block.decorative}
          disabled={disabled}
          onChange={(event) => {
            onChange({
              ...block,
              alt: event.target.checked ? "" : block.alt,
              decorative: event.target.checked,
            });
          }}
          type="checkbox"
        />
        Imagine decorativă
      </label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">
        Text alternativ
        <input
          className={fieldClass}
          disabled={disabled || block.decorative}
          maxLength={500}
          onChange={(event) => setField("alt", event.target.value)}
          value={block.alt}
        />
      </label>
      {(["caption", "credit", "source", "rights"] as const).map((field) => (
        <label className="grid gap-2 text-sm font-bold" key={field}>
          {{
            caption: "Legendă",
            credit: "Credit",
            rights: "Drepturi",
            source: "Sursă HTTPS",
          }[field]}
          <input
            className={fieldClass}
            disabled={disabled}
            maxLength={field === "source" ? 2048 : 500}
            onChange={(event) =>
              setField(field, event.target.value || undefined)
            }
            value={block[field] ?? ""}
          />
        </label>
      ))}
      <div className="grid gap-2 sm:col-span-2">
        <label className="flex min-h-12 w-fit cursor-pointer items-center gap-2 rounded-xl bg-smart-dark px-4 py-3 text-sm font-bold text-smart-white">
          <ImagePlus aria-hidden="true" className="size-4" />
          {uploading ? "Se încarcă…" : "Încarcă și selectează imagine"}
          <input
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        {uploadMessage ? (
          <p aria-live="polite" className="text-sm text-smart-ink/65">
            {uploadMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CalloutFields({
  block,
  disabled,
  onChange,
}: {
  block: CalloutBlock;
  disabled: boolean;
  onChange: (block: ContentBlock) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          Tip casetă
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
            <option value="warning">Avertizare</option>
            <option value="medical-note">Notă medicală</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Titlu opțional
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
      </div>
      <InlineLexicalEditor
        content={block.content}
        disabled={disabled}
        label="Conținut casetă"
        namespace={block.id}
        onChange={(content) => onChange({ ...block, content })}
      />
    </div>
  );
}

function ReferencesFields({
  block,
  disabled,
  onChange,
}: {
  block: ReferencesBlock;
  disabled: boolean;
  onChange: (block: ContentBlock) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold">
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
          className="grid gap-3 rounded-2xl border border-smart-abyss/10 bg-smart-cream/50 p-4 sm:grid-cols-2"
          key={item.id}
        >
          <label className="grid gap-2 text-sm font-bold">
            Etichetă {index + 1}
            <input
              className={fieldClass}
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
          <label className="grid gap-2 text-sm font-bold">
            URL
            <input
              className={fieldClass}
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
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">
            Notă
            <input
              className={fieldClass}
              disabled={disabled}
              maxLength={500}
              onChange={(event) =>
                onChange({
                  ...block,
                  items: block.items.map((candidate) =>
                    candidate.id === item.id
                      ? { ...candidate, note: event.target.value || undefined }
                      : candidate,
                  ),
                })
              }
              value={item.note ?? ""}
            />
          </label>
          <button
            className="w-fit text-xs font-bold text-red-700 disabled:opacity-40"
            disabled={disabled || block.items.length === 1}
            onClick={() =>
              onChange({
                ...block,
                items: block.items.filter((candidate) => candidate.id !== item.id),
              })
            }
            type="button"
          >
            Elimină referința
          </button>
        </div>
      ))}
      <button
        className="flex min-h-11 w-fit items-center gap-2 rounded-xl border border-smart-teal/25 bg-white px-4 py-2 text-sm font-bold text-smart-teal disabled:opacity-40"
        disabled={disabled || block.items.length >= 100}
        onClick={() =>
          onChange({
            ...block,
            items: [...block.items, { id: newId(), label: "" }],
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

function BlockFields({
  block,
  disabled,
  onChange,
}: {
  block: ContentBlock;
  disabled: boolean;
  onChange: (block: ContentBlock) => void;
}) {
  if (
    block.type === "paragraph" ||
    block.type === "heading" ||
    block.type === "blockquote"
  ) {
    return (
      <TextBlockFields block={block} disabled={disabled} onChange={onChange} />
    );
  }
  if (block.type === "list") {
    return <ListFields block={block} disabled={disabled} onChange={onChange} />;
  }
  if (block.type === "image") {
    return <ImageFields block={block} disabled={disabled} onChange={onChange} />;
  }
  if (block.type === "youtube") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          ID video YouTube
          <input
            className={fieldClass}
            disabled={disabled}
            maxLength={11}
            onChange={(event) =>
              onChange({ ...block, videoId: event.target.value })
            }
            value={block.videoId}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Titlu accesibil
          <input
            className={fieldClass}
            disabled={disabled}
            maxLength={200}
            onChange={(event) =>
              onChange({ ...block, title: event.target.value })
            }
            value={block.title}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">
          Rezumat opțional
          <input
            className={fieldClass}
            disabled={disabled}
            maxLength={500}
            onChange={(event) =>
              onChange({ ...block, summary: event.target.value || undefined })
            }
            value={block.summary ?? ""}
          />
        </label>
      </div>
    );
  }
  if (block.type === "callout") {
    return (
      <CalloutFields block={block} disabled={disabled} onChange={onChange} />
    );
  }
  return (
    <ReferencesFields block={block} disabled={disabled} onChange={onChange} />
  );
}

function blockLabel(block: ContentBlock) {
  if (block.type === "heading") return `Titlu H${block.level}`;
  if (block.type === "list") return "Listă";
  if (block.type === "blockquote") return "Citat";
  if (block.type === "image") return "Imagine";
  if (block.type === "youtube") return "YouTube";
  if (block.type === "callout") return "Casetă informativă";
  if (block.type === "references") return "Referințe";
  return "Paragraf";
}

export function ContentBlockEditor({
  disabled = false,
  document,
  onChange,
}: ContentBlockEditorProps) {
  function updateBlock(index: number, block: ContentBlock) {
    onChange({
      ...document,
      blocks: document.blocks.map((candidate, candidateIndex) =>
        candidateIndex === index ? block : candidate,
      ),
    });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= document.blocks.length) return;
    const blocks = [...document.blocks];
    [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
    onChange({ ...document, blocks });
  }

  return (
    <div className="grid gap-5">
      {document.blocks.length ? (
        document.blocks.map((block, index) => (
          <section
            className="rounded-[1.75rem] border border-smart-abyss/10 bg-white/72 p-4 shadow-sm sm:p-5"
            key={block.id}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-smart-teal">
                  Bloc {index + 1}
                </p>
                <h3 className="mt-1 font-serif text-2xl font-semibold">
                  {blockLabel(block)}
                </h3>
              </div>
              <BlockControls
                disabled={disabled}
                index={index}
                length={document.blocks.length}
                onMove={(direction) => moveBlock(index, direction)}
                onRemove={() =>
                  onChange({
                    ...document,
                    blocks: document.blocks.filter(
                      (candidate) => candidate.id !== block.id,
                    ),
                  })
                }
              />
            </div>
            <BlockFields
              block={block}
              disabled={disabled}
              onChange={(nextBlock) => updateBlock(index, nextBlock)}
            />
          </section>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-smart-abyss/20 bg-white/45 px-5 py-10 text-center text-sm text-smart-ink/58">
          Documentul nu conține încă blocuri.
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-smart-abyss/10 bg-smart-cream/70 p-3">
        {(
          [
            ["paragraph", "Paragraf"],
            ["heading-2", "Titlu H2"],
            ["heading-3", "Titlu H3"],
            ["blockquote", "Citat"],
            ["list", "Listă"],
            ["image", "Imagine"],
            ["youtube", "YouTube"],
            ["callout", "Casetă"],
            ["references", "Referințe"],
          ] as const
        ).map(([type, label]) => (
          <button
            className="flex min-h-10 items-center gap-2 rounded-xl border border-smart-abyss/10 bg-white px-3 py-2 text-xs font-bold text-smart-ink transition hover:border-smart-teal hover:text-smart-teal disabled:opacity-40"
            disabled={disabled || document.blocks.length >= 300}
            key={type}
            onClick={() =>
              onChange({
                ...document,
                blocks: [...document.blocks, createBlock(type)],
              })
            }
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
