import assert from "node:assert/strict";
import test from "node:test";

import {
  fromDatabaseContentKind,
  isPublicContentKind,
  toDatabaseContentKind,
} from "@/lib/content/channels";
import { readStoredContentDocument } from "@/lib/content/legacy";
import {
  CONTENT_LIMITS,
  contentDocumentSchema,
  editorialSnapshotSchema,
  normalizeContentHref,
} from "@/lib/content/schema";
import { getPublicBlogRevalidationPaths } from "@/lib/content/revalidation";
import { serializeJsonLd } from "@/lib/content/seo";
import {
  contentDocumentToPlainText,
  estimateContentReadTime,
} from "@/lib/content/text";
import type { ContentDocument } from "@/lib/content/types";

const blockId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";

test("channel mapping keeps CMS News out of public publishing", () => {
  assert.equal(toDatabaseContentKind("blog"), "article");
  assert.equal(toDatabaseContentKind("news"), "news");
  assert.equal(fromDatabaseContentKind("article"), "blog");
  assert.equal(fromDatabaseContentKind("news"), "news");
  assert.equal(fromDatabaseContentKind("announcement"), null);
  assert.equal(isPublicContentKind("blog"), true);
  assert.equal(isPublicContentKind("news"), false);
});

test("public cache invalidation includes only safe old and new Blog paths", () => {
  assert.deepEqual(
    getPublicBlogRevalidationPaths({
      oldSlug: "titlu-vechi",
      newSlug: "titlu-nou",
    }),
    [
      "/blog",
      "/cautare",
      "/sitemap.xml",
      "/blog/titlu-vechi",
      "/blog/titlu-nou",
    ],
  );
  assert.deepEqual(
    getPublicBlogRevalidationPaths({
      oldSlug: "../admin",
      newSlug: "titlu-nou",
    }),
    ["/blog", "/cautare", "/sitemap.xml", "/blog/titlu-nou"],
  );
});

test("v1 schema accepts the approved block and inline formats", () => {
  const document: ContentDocument = {
    version: 1,
    blocks: [
      {
        id: blockId,
        type: "paragraph",
        content: [
          { type: "text", text: "Text ", bold: true },
          {
            type: "link",
            href: "/blog?categorie=admitere#articole",
            text: "intern",
            italic: true,
          },
          {
            type: "link",
            href: "https://example.com/source",
            text: "extern",
          },
        ],
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        type: "heading",
        level: 2,
        content: [{ type: "text", text: "Titlu" }],
      },
      {
        id: "00000000-0000-4000-8000-000000000004",
        type: "list",
        style: "ordered",
        items: [
          {
            id: itemId,
            content: [{ type: "text", text: "Element" }],
          },
        ],
      },
      {
        id: "00000000-0000-4000-8000-000000000005",
        type: "blockquote",
        content: [{ type: "text", text: "Citat" }],
      },
      {
        id: "00000000-0000-4000-8000-000000000006",
        type: "image",
        mediaId: 42,
        decorative: false,
        alt: "Descriere",
        caption: "Legendă",
      },
      {
        id: "00000000-0000-4000-8000-000000000007",
        type: "youtube",
        videoId: "dQw4w9WgXcQ",
        title: "Material video",
      },
      {
        id: "00000000-0000-4000-8000-000000000008",
        type: "callout",
        variant: "medical-note",
        title: "Notă",
        content: [{ type: "text", text: "Informație medicală" }],
      },
      {
        id: "00000000-0000-4000-8000-000000000009",
        type: "references",
        items: [
          {
            id: "00000000-0000-4000-8000-000000000010",
            label: "Sursă",
            url: "https://example.com/reference",
          },
        ],
      },
    ],
  };

  assert.equal(contentDocumentSchema.safeParse(document).success, true);
  assert.match(contentDocumentToPlainText(document), /Informație medicală/u);
  assert.match(estimateContentReadTime(document), /^\d+ min$/u);
});

test("schema rejects unsafe links, unsupported marks, and invalid image accessibility", () => {
  const unsafeLink = {
    version: 1,
    blocks: [
      {
        id: blockId,
        type: "paragraph",
        content: [
          {
            type: "link",
            href: "javascript:alert(1)",
            text: "rău",
          },
        ],
      },
    ],
  };
  const unsupportedMark = {
    version: 1,
    blocks: [
      {
        id: blockId,
        type: "paragraph",
        content: [{ type: "text", text: "text", underline: true }],
      },
    ],
  };
  const missingAlt = {
    version: 1,
    blocks: [
      {
        id: blockId,
        type: "image",
        mediaId: 1,
        decorative: false,
        alt: "",
      },
    ],
  };

  assert.equal(contentDocumentSchema.safeParse(unsafeLink).success, false);
  assert.equal(contentDocumentSchema.safeParse(unsupportedMark).success, false);
  assert.equal(contentDocumentSchema.safeParse(missingAlt).success, false);
  assert.equal(normalizeContentHref("http://example.com"), null);
  assert.equal(normalizeContentHref("//example.com"), null);
  assert.equal(
    normalizeContentHref("/blog/../contact?x=1#formular"),
    "/contact?x=1#formular",
  );
});

test("image sources accept only HTTPS URLs up to the URL limit", () => {
  const unsafeSource: ContentDocument = {
    blocks: [
      {
        alt: "Imagine informativă",
        decorative: false,
        id: "550e8400-e29b-41d4-a716-446655440099",
        mediaId: 7,
        source: "http://example.com/image",
        type: "image",
      },
    ],
    version: 1,
  };

  assert.equal(contentDocumentSchema.safeParse(unsafeSource).success, false);

  const safeSource = structuredClone(unsafeSource);
  const image = safeSource.blocks.at(-1);

  if (image?.type === "image") {
    image.source = "https://example.com/image";
  }

  assert.equal(contentDocumentSchema.safeParse(safeSource).success, true);
});

test("schema enforces text and identifier limits without truncation", () => {
  const oversized = {
    version: 1,
    blocks: [
      {
        id: blockId,
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "x".repeat(CONTENT_LIMITS.paragraph + 1),
          },
        ],
      },
    ],
  };
  const duplicateIds = {
    version: 1,
    blocks: [
      {
        id: blockId,
        type: "paragraph",
        content: [{ type: "text", text: "Unu" }],
      },
      {
        id: blockId,
        type: "paragraph",
        content: [{ type: "text", text: "Doi" }],
      },
    ],
  };

  assert.equal(contentDocumentSchema.safeParse(oversized).success, false);
  assert.equal(contentDocumentSchema.safeParse(duplicateIds).success, false);
});

test("editorial snapshots validate the immutable v1 metadata contract", () => {
  const result = editorialSnapshotSchema.safeParse({
    version: 1,
    title: "Articol SmartMed",
    slug: "articol-smartmed",
    excerpt: "Rezumat editorial",
    authorId: 2,
    coverMediaId: null,
    categoryIds: [3],
    tagIds: [4, 5],
    seoTitle: null,
    seoDescription: null,
    publishedAt: "2026-07-29T10:00:00.000Z",
    reviewer: null,
    reviewDate: null,
    disclaimer: null,
    correctionNote: null,
    relatedEntryIds: [],
  });

  assert.equal(result.success, true);
});

test("legacy adapter converts supported blocks and skips unknown markup", () => {
  const result = readStoredContentDocument(
    [
      { type: "paragraph", text: "Primul paragraf" },
      { type: "header", data: { text: "Subtitlu", level: 3 } },
      {
        type: "list",
        data: { style: "ordered", items: ["Unu", { content: "Doi" }] },
      },
      { type: "html", html: "<script>alert(1)</script>" },
    ],
    0,
  );

  assert.equal(result.document.blocks.length, 3);
  assert.equal(result.document.blocks[1]?.type, "heading");
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0]?.code, "legacy-block-skipped");
});

test("defensive reader drops only malformed v1 blocks", () => {
  const result = readStoredContentDocument(
    {
      version: 1,
      blocks: [
        {
          id: blockId,
          type: "paragraph",
          content: [{ type: "text", text: "Sigur" }],
        },
        {
          id: "invalid",
          type: "paragraph",
          content: [{ type: "text", text: "<img onerror=alert(1)>" }],
        },
      ],
    },
    1,
  );

  assert.equal(result.document.blocks.length, 1);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0]?.blockIndex, 1);
});

test("JSON-LD serialization neutralizes script-breaking characters", () => {
  const serialized = serializeJsonLd({
    headline: "</script><script>alert(1)</script>",
  });

  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.includes(">"), false);
  assert.match(serialized, /\\u003c\/script\\u003e/u);
});
