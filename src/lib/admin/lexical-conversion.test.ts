import assert from "node:assert/strict";
import test from "node:test";

import {
  contentInlineToLexicalState,
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
