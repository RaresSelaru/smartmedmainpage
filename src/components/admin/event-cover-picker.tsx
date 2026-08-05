"use client";

import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type EventCoverPickerProps = {
  coverMediaId: number | null;
  disabled?: boolean;
  onChange: (mediaId: number | null) => void;
  title: string;
};

export function EventCoverPicker({
  coverMediaId,
  disabled = false,
  onChange,
  title,
}: EventCoverPickerProps) {
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
        ? `Imagine de copertă pentru evenimentul „${title.trim()}”`
        : "Imagine de copertă pentru un eveniment SmartMed",
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
      setMessage("Coperta este pregătită. Salvează evenimentul pentru a o păstra.");
    } catch {
      setMessage("Coperta nu a putut fi încărcată. Încearcă din nou.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div
        className="group relative aspect-[16/9] overflow-hidden rounded-[1.75rem] border border-dashed border-smart-teal/35 bg-smart-cream/70"
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
            alt={`Previzualizarea copertei pentru ${title || "eveniment"}`}
            className="object-cover"
            fill
            onError={() => setPreviewFailed(true)}
            sizes="(max-width: 1024px) 100vw, 52vw"
            src={previewUrl}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-smart-ink/55">
            <span className="flex size-14 items-center justify-center rounded-full bg-white text-smart-teal shadow-sm">
              <ImagePlus aria-hidden="true" className="size-6" />
            </span>
            <span className="font-serif text-2xl font-semibold text-smart-ink">
              Alege imaginea evenimentului
            </span>
            <span className="max-w-sm text-sm leading-6">
              Apasă aici sau trage o imagine. O optimizăm automat pentru site.
            </span>
          </div>
        )}

        <label className="absolute inset-0 flex cursor-pointer items-end justify-center bg-gradient-to-t from-smart-abyss/75 via-transparent to-transparent p-5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-smart-teal shadow-lg">
            {uploading ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
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
            <LoaderCircle aria-hidden="true" className="mr-2 size-5 animate-spin" />
            Se pregătește coperta…
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-smart-ink/55">
        <span>JPG, PNG sau WebP · format recomandat 16:9</span>
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
