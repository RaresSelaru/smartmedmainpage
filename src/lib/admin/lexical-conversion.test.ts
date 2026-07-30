import assert from "node:assert/strict";
import test from "node:test";

import { createEditor } from "lexical";

import { approvedSmartMedLexicalNodes } from "../../components/admin/lexical-content-nodes.ts";
import { contentDocumentSchema } from "../content/schema.ts";
import type { ContentDocument } from "../content/types.ts";
import {
  contentDocumentToLexicalState,
  contentInlineToLexicalState,
  lexicalStateToContentDocument,
  lexicalStateToContentInline,
} from "./lexical-conversion.ts";

test("Lexical conversion preserves approved marks and safe links", () => {
  const content = [
    { type: "text" as const, text: "Smart", bold: true as const },
    {
      type: "link" as const,
      href: "https://example.com/resursa",
      text: "Med",
      italic: true as const,
    },
  ];

  assert.deepEqual(
    lexicalStateToContentInline(contentInlineToLexicalState(content)),
    content,
  );
});

test("Lexical conversion degrades unsafe links to plain text", () => {
  const state = contentInlineToLexicalState([
    {
      type: "link",
      href: "/sigur",
      text: "Text",
    },
  ]);
  const link = state.root.children[0]?.children[0];

  if (link && "url" in link) {
    link.url = "javascript:alert(1)";
  }

  assert.deepEqual(lexicalStateToContentInline(state), [
    { type: "text", text: "Text" },
  ]);
});

test("a complete CMS document survives the unified Lexical editor round trip", () => {
  const document: ContentDocument = {
    blocks: [
      {
        content: [
          { bold: true, text: "Introducere ", type: "text" },
          {
            href: "https://example.com/resursa",
            italic: true,
            text: "cu link",
            type: "link",
          },
        ],
        id: "00000000-0000-4000-8000-000000000201",
        type: "paragraph",
      },
      {
        content: [{ text: "Titlu de secțiune", type: "text" }],
        id: "00000000-0000-4000-8000-000000000202",
        level: 2,
        type: "heading",
      },
      {
        id: "00000000-0000-4000-8000-000000000203",
        items: [
          {
            content: [{ text: "Primul element", type: "text" }],
            id: "00000000-0000-4000-8000-000000000204",
          },
          {
            content: [{ italic: true, text: "Al doilea", type: "text" }],
            id: "00000000-0000-4000-8000-000000000205",
          },
        ],
        style: "ordered",
        type: "list",
      },
      {
        content: [{ text: "Un citat", type: "text" }],
        id: "00000000-0000-4000-8000-000000000206",
        type: "blockquote",
      },
      {
        alt: "Student la laptop",
        caption: "Studiu individual",
        credit: "SmartMed",
        decorative: false,
        id: "00000000-0000-4000-8000-000000000207",
        mediaId: 17,
        rights: "Utilizare editorială",
        source: "https://example.com/imagine",
        type: "image",
      },
      {
        id: "00000000-0000-4000-8000-000000000208",
        summary: "Rezumatul videoclipului",
        title: "Lecție SmartMed",
        type: "youtube",
        videoId: "dQw4w9WgXcQ",
      },
      {
        content: [{ bold: true, text: "Reține acest lucru.", type: "text" }],
        id: "00000000-0000-4000-8000-000000000209",
        title: "Important",
        type: "callout",
        variant: "medical-note",
      },
      {
        id: "00000000-0000-4000-8000-000000000210",
        items: [
          {
            id: "00000000-0000-4000-8000-000000000211",
            label: "Ghid medical",
            note: "Accesat recent",
            url: "https://example.com/ghid",
          },
        ],
        title: "Referințe",
        type: "references",
      },
    ],
    version: 1,
  };
  const editor = createEditor({
    namespace: "smartmed-document-round-trip",
    nodes: approvedSmartMedLexicalNodes,
    onError(error) {
      throw error;
    },
  });
  const editorState = editor.parseEditorState(
    JSON.stringify(contentDocumentToLexicalState(document)),
  );
  const candidate = lexicalStateToContentDocument(
    editorState.toJSON(),
    document,
  );
  const parsed = contentDocumentSchema.parse(candidate);

  assert.deepEqual(parsed, document);
  assert.equal(
    (
      editorState.toJSON().root.children[0] as {
        $?: { smartmedId?: string };
      }
    ).$?.smartmedId,
    document.blocks[0]?.id,
  );
});

test("transient blank editor rows are omitted and pasted heading levels are normalized", () => {
  const candidate = lexicalStateToContentDocument({
    root: {
      children: [
        {
          children: [],
          direction: null,
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          type: "paragraph",
          version: 1,
        },
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: "Titlu lipit",
              type: "text",
              version: 1,
            },
          ],
          direction: null,
          format: "",
          indent: 0,
          tag: "h4",
          type: "heading",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });

  assert.equal(candidate.blocks.length, 1);
  assert.equal(candidate.blocks[0]?.type, "heading");
  assert.equal(
    candidate.blocks[0]?.type === "heading"
      ? candidate.blocks[0].level
      : null,
    3,
  );
  assert.equal(contentDocumentSchema.safeParse(candidate).success, true);
});
