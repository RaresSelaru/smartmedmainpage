import assert from "node:assert/strict";
import test from "node:test";

import { $getRoot, createEditor } from "lexical";

import {
  approvedSmartMedLexicalNodes,
  SmartMedCalloutNode,
  SmartMedImageNode,
  SmartMedReferencesNode,
  SmartMedYouTubeNode,
} from "./lexical-content-nodes.ts";

const structuredNodes = [
  {
    block: {
      alt: "Diagramă medicală",
      decorative: false,
      id: "00000000-0000-4000-8000-000000000101",
      mediaId: 17,
      rights: "Utilizare editorială",
      source: "https://example.com/image",
      type: "image",
    },
    type: "smartmed-image",
    version: 1,
  },
  {
    block: {
      id: "00000000-0000-4000-8000-000000000102",
      summary: "Rezumat accesibil",
      title: "Material medical",
      type: "youtube",
      videoId: "dQw4w9WgXcQ",
    },
    type: "smartmed-youtube",
    version: 1,
  },
  {
    block: {
      content: [{ bold: true, text: "Important", type: "text" }],
      id: "00000000-0000-4000-8000-000000000103",
      title: "Atenție",
      type: "callout",
      variant: "medical-note",
    },
    type: "smartmed-callout",
    version: 1,
  },
  {
    block: {
      id: "00000000-0000-4000-8000-000000000104",
      items: [
        {
          id: "00000000-0000-4000-8000-000000000105",
          label: "Ghid",
          url: "https://example.com/guide",
        },
      ],
      title: "Referințe",
      type: "references",
    },
    type: "smartmed-references",
    version: 1,
  },
] as const;

function createStructuredEditor() {
  return createEditor({
    namespace: "smartmed-structured-node-test",
    nodes: approvedSmartMedLexicalNodes,
    onError(error) {
      throw error;
    },
  });
}

test("approved structured Lexical nodes round-trip only canonical block payloads", () => {
  const editor = createStructuredEditor();
  const editorState = editor.parseEditorState(
    JSON.stringify({
      root: {
        children: structuredNodes,
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    }),
  );
  const serialized = editorState.toJSON();

  assert.deepEqual(
    serialized.root.children.map((node) => ({
      block: "block" in node ? node.block : null,
      type: node.type,
      version: node.version,
    })),
    structuredNodes,
  );

  editorState.read(() => {
    const children = $getRoot().getChildren();
    assert.equal(children[0] instanceof SmartMedImageNode, true);
    assert.equal(children[1] instanceof SmartMedYouTubeNode, true);
    assert.equal(children[2] instanceof SmartMedCalloutNode, true);
    assert.equal(children[3] instanceof SmartMedReferencesNode, true);

    for (const child of children) {
      assert.equal(child.exportDOM(editor).element, null);
    }
  });
});

test("structured Lexical nodes have no HTML import path and reject extra markup", () => {
  assert.equal(SmartMedImageNode.importDOM(), null);
  assert.equal(SmartMedYouTubeNode.importDOM(), null);
  assert.equal(SmartMedCalloutNode.importDOM(), null);
  assert.equal(SmartMedReferencesNode.importDOM(), null);

  const editor = createStructuredEditor();
  const unsafeImage = structuredClone(structuredNodes[0]) as {
    block: Record<string, unknown>;
    type: string;
    version: number;
  };
  unsafeImage.block.html = "<img src=x onerror=alert(1)>";

  assert.throws(() =>
    editor.parseEditorState(
      JSON.stringify({
        root: {
          children: [unsafeImage],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      }),
    ),
  );
});
