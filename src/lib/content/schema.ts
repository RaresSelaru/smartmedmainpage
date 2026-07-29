import { z } from "zod";

import {
  CONTENT_DOCUMENT_VERSION,
  type ContentDocument,
  type EditorialSnapshotV1,
} from "@/lib/content/types";

export const CONTENT_LIMITS = {
  annotation: 500,
  blocks: 300,
  documentBytes: 512 * 1024,
  excerpt: 320,
  heading: 200,
  listItems: 100,
  listItemText: 1_000,
  paragraph: 5_000,
  references: 100,
  seoDescription: 180,
  seoTitle: 70,
  slug: 160,
  title: 160,
  totalText: 100_000,
  url: 2_048,
  youtubeTitle: 200,
} as const;

const controlCharacterPattern = /[\u0000-\u001f\u007f]/u;
const safeInternalPathPattern = /^\/(?!\/)/u;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/u;

function isSafeHref(value: string): boolean {
  if (value.length > CONTENT_LIMITS.url || controlCharacterPattern.test(value)) {
    return false;
  }

  if (safeInternalPathPattern.test(value) && !value.includes("\\")) {
    try {
      const parsed = new URL(value, "https://smartmed.invalid");
      return (
        parsed.origin === "https://smartmed.invalid" &&
        !parsed.username &&
        !parsed.password
      );
    } catch {
      return false;
    }
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function isInternalContentHref(href: string): boolean {
  return safeInternalPathPattern.test(href) && isSafeHref(href);
}

export function normalizeContentHref(href: string): string | null {
  const trimmed = href.trim();

  if (!isSafeHref(trimmed)) {
    return null;
  }

  if (isInternalContentHref(trimmed)) {
    const parsed = new URL(trimmed, "https://smartmed.invalid");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  return new URL(trimmed).toString();
}

const identifierSchema = z.uuid();

const textRunSchema = z
  .object({
    type: z.literal("text"),
    text: z.string().min(1).max(CONTENT_LIMITS.paragraph),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
  })
  .strict();

const linkRunSchema = z
  .object({
    type: z.literal("link"),
    href: z
      .string()
      .min(1)
      .max(CONTENT_LIMITS.url)
      .refine(isSafeHref, "Linkul trebuie să fie intern sau să folosească HTTPS.")
      .transform((value) => normalizeContentHref(value) as string),
    text: z.string().min(1).max(CONTENT_LIMITS.paragraph),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
  })
  .strict();

export const contentInlineSchema = z.discriminatedUnion("type", [
  textRunSchema,
  linkRunSchema,
]);

const paragraphInlineSchema = z
  .array(contentInlineSchema)
  .min(1)
  .max(CONTENT_LIMITS.paragraph)
  .superRefine((runs, context) => {
    const length = runs.reduce((total, run) => total + run.text.length, 0);

    if (length > CONTENT_LIMITS.paragraph) {
      context.addIssue({
        code: "custom",
        message: `Paragraful poate conține cel mult ${CONTENT_LIMITS.paragraph} de caractere.`,
      });
    }
  });

const headingInlineSchema = z
  .array(contentInlineSchema)
  .min(1)
  .max(CONTENT_LIMITS.heading)
  .superRefine((runs, context) => {
    const length = runs.reduce((total, run) => total + run.text.length, 0);

    if (length > CONTENT_LIMITS.heading) {
      context.addIssue({
        code: "custom",
        message: `Titlul poate conține cel mult ${CONTENT_LIMITS.heading} de caractere.`,
      });
    }
  });

const listItemInlineSchema = z
  .array(contentInlineSchema)
  .min(1)
  .max(CONTENT_LIMITS.listItemText)
  .superRefine((runs, context) => {
    const length = runs.reduce((total, run) => total + run.text.length, 0);

    if (length > CONTENT_LIMITS.listItemText) {
      context.addIssue({
        code: "custom",
        message: `Elementul poate conține cel mult ${CONTENT_LIMITS.listItemText} de caractere.`,
      });
    }
  });

const paragraphBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("paragraph"),
    content: paragraphInlineSchema,
  })
  .strict();

const headingBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    content: headingInlineSchema,
  })
  .strict();

const listBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("list"),
    style: z.enum(["ordered", "unordered"]),
    items: z
      .array(
        z
          .object({
            id: identifierSchema,
            content: listItemInlineSchema,
          })
          .strict(),
      )
      .min(1)
      .max(CONTENT_LIMITS.listItems),
  })
  .strict();

const blockquoteBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("blockquote"),
    content: paragraphInlineSchema,
  })
  .strict();

const annotationSchema = z.string().trim().min(1).max(CONTENT_LIMITS.annotation);
const httpsSourceSchema = z
  .string()
  .trim()
  .min(1)
  .max(CONTENT_LIMITS.url)
  .url()
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Sursa imaginii trebuie să folosească HTTPS.",
  });

const imageBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("image"),
    mediaId: z.number().int().positive(),
    decorative: z.boolean(),
    alt: z.string().trim().max(CONTENT_LIMITS.annotation),
    caption: annotationSchema.optional(),
    credit: annotationSchema.optional(),
    source: httpsSourceSchema.optional(),
    rights: annotationSchema.optional(),
  })
  .strict()
  .superRefine((image, context) => {
    if (!image.decorative && image.alt.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Textul alternativ este obligatoriu pentru imaginile informative.",
        path: ["alt"],
      });
    }

    if (image.decorative && image.alt.length > 0) {
      context.addIssue({
        code: "custom",
        message: "Imaginile decorative trebuie să aibă textul alternativ gol.",
        path: ["alt"],
      });
    }
  });

const youtubeBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("youtube"),
    videoId: z.string().regex(youtubeVideoIdPattern),
    title: z.string().trim().min(1).max(CONTENT_LIMITS.youtubeTitle),
    summary: annotationSchema.optional(),
  })
  .strict();

const calloutBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("callout"),
    variant: z.enum(["important", "warning", "medical-note"]),
    title: z.string().trim().min(1).max(CONTENT_LIMITS.heading).optional(),
    content: paragraphInlineSchema,
  })
  .strict();

const referencesBlockSchema = z
  .object({
    id: identifierSchema,
    type: z.literal("references"),
    title: z.string().trim().min(1).max(CONTENT_LIMITS.heading).optional(),
    items: z
      .array(
        z
          .object({
            id: identifierSchema,
            label: z.string().trim().min(1).max(CONTENT_LIMITS.listItemText),
            url: z
              .string()
              .min(1)
              .max(CONTENT_LIMITS.url)
              .refine(isSafeHref)
              .transform((value) => normalizeContentHref(value) as string)
              .optional(),
            note: annotationSchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(CONTENT_LIMITS.references),
  })
  .strict();

export const contentBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  listBlockSchema,
  blockquoteBlockSchema,
  imageBlockSchema,
  youtubeBlockSchema,
  calloutBlockSchema,
  referencesBlockSchema,
]);

function collectDocumentTextLength(document: ContentDocument): number {
  return document.blocks.reduce((documentTotal, block) => {
    if ("content" in block) {
      return (
        documentTotal +
        block.content.reduce((blockTotal, run) => blockTotal + run.text.length, 0)
      );
    }

    if (block.type === "list") {
      return (
        documentTotal +
        block.items.reduce(
          (listTotal, item) =>
            listTotal +
            item.content.reduce((itemTotal, run) => itemTotal + run.text.length, 0),
          0,
        )
      );
    }

    if (block.type === "image") {
      return (
        documentTotal +
        [block.alt, block.caption, block.credit, block.source, block.rights]
          .filter((value): value is string => Boolean(value))
          .join(" ").length
      );
    }

    if (block.type === "youtube") {
      return documentTotal + block.title.length + (block.summary?.length ?? 0);
    }

    return (
      documentTotal +
      (block.title?.length ?? 0) +
      block.items.reduce(
        (referencesTotal, item) =>
          referencesTotal +
          item.label.length +
          (item.url?.length ?? 0) +
          (item.note?.length ?? 0),
        0,
      )
    );
  }, 0);
}

export const contentDocumentSchema = z
  .object({
    version: z.literal(CONTENT_DOCUMENT_VERSION),
    blocks: z.array(contentBlockSchema).max(CONTENT_LIMITS.blocks),
  })
  .strict()
  .superRefine((document, context) => {
    const blockIds = new Set<string>();
    let duplicateId = false;

    for (const block of document.blocks) {
      if (blockIds.has(block.id)) {
        duplicateId = true;
      }
      blockIds.add(block.id);

      if (block.type === "list" || block.type === "references") {
        for (const item of block.items) {
          if (blockIds.has(item.id)) {
            duplicateId = true;
          }
          blockIds.add(item.id);
        }
      }
    }

    if (duplicateId) {
      context.addIssue({
        code: "custom",
        message: "Identificatorii blocurilor și elementelor trebuie să fie unici.",
      });
    }

    if (collectDocumentTextLength(document) > CONTENT_LIMITS.totalText) {
      context.addIssue({
        code: "custom",
        message: `Documentul poate conține cel mult ${CONTENT_LIMITS.totalText} de caractere.`,
      });
    }

    const serialized = JSON.stringify(document);
    const byteLength = new TextEncoder().encode(serialized).byteLength;

    if (byteLength > CONTENT_LIMITS.documentBytes) {
      context.addIssue({
        code: "custom",
        message: `Documentul poate ocupa cel mult ${CONTENT_LIMITS.documentBytes} de octeți.`,
      });
    }
  });

const nullableIdentifierListSchema = z.array(z.number().int().positive()).max(100);
const nullableDateTimeSchema = z.iso.datetime({ offset: true }).nullable();

export const editorialSnapshotSchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1).max(CONTENT_LIMITS.title),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(CONTENT_LIMITS.slug)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    excerpt: z.string().trim().min(1).max(CONTENT_LIMITS.excerpt),
    authorId: z.number().int().positive().nullable(),
    coverMediaId: z.number().int().positive().nullable(),
    categoryIds: nullableIdentifierListSchema,
    tagIds: nullableIdentifierListSchema,
    seoTitle: z.string().trim().min(1).max(CONTENT_LIMITS.seoTitle).nullable(),
    seoDescription: z
      .string()
      .trim()
      .min(1)
      .max(CONTENT_LIMITS.seoDescription)
      .nullable(),
    publishedAt: nullableDateTimeSchema,
    reviewer: z.string().trim().min(1).max(CONTENT_LIMITS.annotation).nullable(),
    reviewDate: nullableDateTimeSchema,
    disclaimer: z.string().trim().min(1).max(CONTENT_LIMITS.annotation).nullable(),
    correctionNote: z
      .string()
      .trim()
      .min(1)
      .max(CONTENT_LIMITS.annotation)
      .nullable(),
    relatedEntryIds: nullableIdentifierListSchema,
  })
  .strict() satisfies z.ZodType<EditorialSnapshotV1>;

export function parseContentDocument(value: unknown): ContentDocument {
  return contentDocumentSchema.parse(value) as ContentDocument;
}

export function safeParseContentDocument(value: unknown) {
  return contentDocumentSchema.safeParse(value);
}
