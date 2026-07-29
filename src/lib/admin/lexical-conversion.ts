import {
  normalizeContentHref,
  safeParseContentDocument,
} from "@/lib/content/schema";
import type {
  ContentDocument,
  ContentInline,
} from "@/lib/content/types";

type UnknownRecord = Record<string, unknown>;

const textFormatBold = 1;
const textFormatItalic = 2;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function lexicalTextNode(run: ContentInline) {
  const format =
    (run.bold ? textFormatBold : 0) |
    (run.italic ? textFormatItalic : 0);
  const text = {
    detail: 0,
    format,
    mode: "normal",
    style: "",
    text: run.text,
    type: "text",
    version: 1,
  };

  if (run.type === "text") {
    return text;
  }

  return {
    children: [text],
    direction: null,
    format: "",
    indent: 0,
    rel: null,
    target: null,
    title: null,
    type: "link",
    url: run.href,
    version: 1,
  };
}

export function contentInlineToLexicalState(content: ContentInline[]) {
  return {
    root: {
      children: [
        {
          children: content.map(lexicalTextNode),
          direction: null,
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          type: "paragraph",
          version: 1,
        },
      ],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

function appendRun(target: ContentInline[], run: ContentInline) {
  if (!run.text) {
    return;
  }

  const previous = target.at(-1);

  if (
    previous &&
    previous.type === run.type &&
    previous.bold === run.bold &&
    previous.italic === run.italic &&
    (previous.type === "text" ||
      (run.type === "link" && previous.href === run.href))
  ) {
    previous.text += run.text;
    return;
  }

  target.push(run);
}

function readTextNode(
  node: UnknownRecord,
  target: ContentInline[],
  href?: string,
) {
  if (node.type !== "text" || typeof node.text !== "string") {
    return;
  }

  const format = typeof node.format === "number" ? node.format : 0;
  const base = {
    ...(format & textFormatBold ? { bold: true as const } : {}),
    ...(format & textFormatItalic ? { italic: true as const } : {}),
    text: node.text,
  };

  appendRun(
    target,
    href
      ? {
          ...base,
          href,
          type: "link",
        }
      : {
          ...base,
          type: "text",
        },
  );
}

function readChildren(
  value: unknown,
  target: ContentInline[],
  inheritedHref?: string,
) {
  if (!Array.isArray(value)) {
    return;
  }

  value.forEach((candidate, index) => {
    const node = asRecord(candidate);

    if (!node) {
      return;
    }

    if (node.type === "text") {
      readTextNode(node, target, inheritedHref);
      return;
    }

    const href =
      node.type === "link" && typeof node.url === "string"
        ? normalizeContentHref(node.url) ?? undefined
        : inheritedHref;

    readChildren(node.children, target, href);

    if (
      !inheritedHref &&
      index < value.length - 1 &&
      (node.type === "paragraph" || node.type === "linebreak")
    ) {
      appendRun(target, { type: "text", text: "\n" });
    }
  });
}

export function lexicalStateToContentInline(value: unknown): ContentInline[] {
  const root = asRecord(asRecord(value)?.root);
  const content: ContentInline[] = [];

  readChildren(root?.children, content);
  return content;
}

export function validateEditorDocument(value: unknown): ContentDocument | null {
  const parsed = safeParseContentDocument(value);
  return parsed.success ? (parsed.data as ContentDocument) : null;
}
