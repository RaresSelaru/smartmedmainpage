"use client";

import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createContentAction } from "@/app/admin/content/actions";
import { slugifyEditorialTitle } from "@/lib/admin/content-form-utils";
import type { ContentKind, EditorialSnapshotV1 } from "@/lib/content/types";

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-smart-abyss/15 bg-white px-4 py-3 text-sm outline-none focus:border-smart-teal focus:ring-2 focus:ring-smart-aqua/30";

export function NewContentForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<ContentKind>("blog");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function submit() {
    setMessage(null);
    setFieldErrors({});

    const snapshot: EditorialSnapshotV1 = {
      authorId: null,
      categoryIds: [],
      correctionNote: null,
      coverMediaId: null,
      disclaimer: null,
      excerpt,
      publishedAt: null,
      relatedEntryIds: [],
      reviewDate: null,
      reviewer: null,
      seoDescription: null,
      seoTitle: null,
      slug,
      tagIds: [],
      title,
      version: 1,
    };

    startTransition(async () => {
      const result = await createContentAction({
        changeSummary: "Versiune inițială",
        document: { blocks: [], version: 1 },
        kind,
        snapshot,
      });

      if (!result.ok) {
        setMessage(result.message);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      router.push(`/admin/content/${result.data.entryId}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        className="inline-flex items-center gap-2 text-sm font-bold text-smart-teal"
        href="/admin/content"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Înapoi la conținut
      </Link>

      <header className="mt-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-smart-teal">
          Conținut nou
        </p>
        <h1 className="mt-3 font-serif text-5xl font-semibold leading-none sm:text-6xl">
          Pornește o versiune editorială
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-smart-ink/65">
          Înregistrarea este creată atomic împreună cu prima revizie
          nemodificabilă. Structura completă poate fi adăugată în editor după
          creare.
        </p>
      </header>

      <form
        className="mt-8 grid gap-6 rounded-[2rem] border border-smart-abyss/10 bg-white/75 p-6 shadow-[0_24px_70px_rgba(3,17,28,0.08)] sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <fieldset className="grid gap-3">
          <legend className="text-sm font-bold">Canal editorial</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["blog", "Blog", "Poate fi publicat la /blog."],
                [
                  "news",
                  "News",
                  "Poate fi salvat și previzualizat, dar publicarea este dezactivată.",
                ],
              ] as const
            ).map(([value, label, description]) => (
              <label
                className="flex cursor-pointer gap-3 rounded-2xl border border-smart-abyss/12 bg-smart-cream/45 p-4"
                key={value}
              >
                <input
                  checked={kind === value}
                  name="kind"
                  onChange={() => setKind(value)}
                  type="radio"
                  value={value}
                />
                <span>
                  <strong className="block">{label}</strong>
                  <span className="mt-1 block text-xs leading-5 text-smart-ink/60">
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {kind === "news" ? (
          <p className="rounded-2xl border border-amber-300/45 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Publicarea News nu este activată deoarece canalul public News nu a
            fost încă implementat.
          </p>
        ) : null}

        <label className="grid gap-2 text-sm font-bold" htmlFor="new-title">
          Titlu
          <input
            className={fieldClass}
            id="new-title"
            maxLength={160}
            onChange={(event) => {
              const nextTitle = event.target.value;
              setTitle(nextTitle);
              if (!slug || slug === slugifyEditorialTitle(title)) {
                setSlug(slugifyEditorialTitle(nextTitle));
              }
            }}
            required
            value={title}
          />
          {fieldErrors["snapshot.title"]?.map((error) => (
            <span className="text-xs text-red-700" key={error}>
              {error}
            </span>
          ))}
        </label>

        <label className="grid gap-2 text-sm font-bold" htmlFor="new-slug">
          Slug unic
          <input
            className={fieldClass}
            id="new-slug"
            maxLength={160}
            onChange={(event) => setSlug(event.target.value)}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            required
            value={slug}
          />
          {fieldErrors["snapshot.slug"]?.map((error) => (
            <span className="text-xs text-red-700" key={error}>
              {error}
            </span>
          ))}
        </label>

        <label className="grid gap-2 text-sm font-bold" htmlFor="new-excerpt">
          Rezumat
          <textarea
            className={`${fieldClass} min-h-28 resize-y`}
            id="new-excerpt"
            maxLength={320}
            onChange={(event) => setExcerpt(event.target.value)}
            required
            value={excerpt}
          />
          <span className="text-xs font-normal text-smart-ink/50">
            {excerpt.length}/320
          </span>
          {fieldErrors["snapshot.excerpt"]?.map((error) => (
            <span className="text-xs text-red-700" key={error}>
              {error}
            </span>
          ))}
        </label>

        {message ? (
          <p
            aria-live="polite"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            {message}
          </p>
        ) : null}

        <button
          className="flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-smart-dark px-5 py-3 text-sm font-bold text-smart-white transition hover:bg-smart-teal disabled:cursor-wait disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          {pending ? "Se creează…" : "Creează versiunea inițială"}
        </button>
      </form>
    </div>
  );
}
