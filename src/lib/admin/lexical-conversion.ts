import {
  normalizeContentHref,
  safeParseContentDocument,
} from "@/lib/content/schema";
import type {
  ContentBlock,
  ContentDocument,
  ContentInline,
  ContentListItem,
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

function lexicalElement(
  type: "paragraph" | "quote",
  content: ContentInline[],
  id?: string,
) {
  return {
    ...(id ? { $: { smartmedId: id } } : {}),
    children: content.filter((run) => run.text.length > 0).map(lexicalTextNode),
    direction: null,
    format: "",
    indent: 0,
    type,
    version: 1,
    ...(type === "paragraph"
      ? {
          textFormat: 0,
          textStyle: "",
        }
      : {}),
  };
}

export function contentInlineToLexicalState(content: ContentInline[]) {
  return {
    root: {
      children: [lexicalElement("paragraph", content)],
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

    if (node.type === "linebreak") {
      appendRun(target, { type: "text", text: "\n" });
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

function lexicalBlockNode(block: ContentBlock) {
  if (block.type === "paragraph") {
    return lexicalElement("paragraph", block.content, block.id);
  }

  if (block.type === "heading") {
    return {
      $: { smartmedId: block.id },
      children: block.content
        .filter((run) => run.text.length > 0)
        .map(lexicalTextNode),
      direction: null,
      format: "",
      indent: 0,
      tag: `h${block.level}`,
      type: "heading",
      version: 1,
    };
  }

  if (block.type === "blockquote") {
    return lexicalElement("quote", block.content, block.id);
  }

  if (block.type === "list") {
    const ordered = block.style === "ordered";

    return {
      $: { smartmedId: block.id },
      children: block.items.map((item, index) => ({
        $: { smartmedId: item.id },
        children: item.content
          .filter((run) => run.text.length > 0)
          .map(lexicalTextNode),
        direction: null,
        format: "",
        indent: 0,
        type: "listitem",
        value: ordered ? index + 1 : 1,
        version: 1,
      })),
      direction: null,
      format: "",
      indent: 0,
      listType: ordered ? "number" : "bullet",
      start: 1,
      tag: ordered ? "ol" : "ul",
      type: "list",
      version: 1,
    };
  }

  return {
    block,
    type: `smartmed-${block.type}`,
    version: 1,
  };
}

export function contentDocumentToLexicalState(document: ContentDocument) {
  const children: ReturnType<typeof lexicalBlockNode>[] = [];

  document.blocks.forEach((block, index) => {
    children.push(lexicalBlockNode(block));
    const nextBlock = document.blocks[index + 1];

    // Lexical merges adjacent lists of the same type. This editor-only
    // paragraph preserves the two CMS block boundaries and is omitted again
    // when the document is exported.
    if (
      block.type === "list" &&
      nextBlock?.type === "list" &&
      block.style === nextBlock.style
    ) {
      children.push(lexicalElement("paragraph", []));
    }
  });

  const lastBlock = document.blocks.at(-1);
  if (
    lastBlock &&
    (lastBlock.type === "image" ||
      lastBlock.type === "youtube" ||
      lastBlock.type === "callout" ||
      lastBlock.type === "references")
  ) {
    children.push(lexicalElement("paragraph", []));
  }

  return {
    root: {
      children:
        children.length > 0
          ? children
          : [lexicalElement("paragraph", [])],
      direction: null,
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  };
}

function inlineFromNode(node: UnknownRecord): ContentInline[] {
  const content: ContentInline[] = [];
  readChildren(node.children, content);
  return content;
}

function hasReadableText(content: ContentInline[]): boolean {
  return content.some((run) => run.text.trim().length > 0);
}

function blockKind(node: UnknownRecord): ContentBlock["type"] | null {
  if (node.type === "paragraph") return "paragraph";
  if (node.type === "heading") return "heading";
  if (node.type === "quote") return "blockquote";
  if (node.type === "list") return "list";
  if (node.type === "smartmed-image") return "image";
  if (node.type === "smartmed-youtube") return "youtube";
  if (node.type === "smartmed-callout") return "callout";
  if (node.type === "smartmed-references") return "references";
  return null;
}

function compatibleBlock(
  block: ContentBlock,
  type: ContentBlock["type"],
): boolean {
  return block.type === type;
}

function readNodeIdentifier(node: UnknownRecord): string | null {
  const state = asRecord(node.$);
  return typeof state?.smartmedId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      state.smartmedId,
    )
    ? state.smartmedId
    : null;
}

function createIdentifier(
  usedIds: Set<string>,
  reservedIds: Set<string>,
): string {
  let id = crypto.randomUUID();

  while (usedIds.has(id) || reservedIds.has(id)) {
    id = crypto.randomUUID();
  }

  return id;
}

function reuseBlockId({
  index,
  nodeId,
  previousDocument,
  reservedIds,
  type,
  usedIds,
}: {
  index: number;
  nodeId?: string | null;
  previousDocument?: ContentDocument;
  reservedIds: Set<string>;
  type: ContentBlock["type"];
  usedIds: Set<string>;
}): string {
  if (
    nodeId &&
    !usedIds.has(nodeId) &&
    !reservedIds.has(nodeId)
  ) {
    usedIds.add(nodeId);
    return nodeId;
  }

  const direct = previousDocument?.blocks[index];

  if (
    direct &&
    compatibleBlock(direct, type) &&
    !usedIds.has(direct.id) &&
    !reservedIds.has(direct.id)
  ) {
    usedIds.add(direct.id);
    return direct.id;
  }

  const candidate = previousDocument?.blocks.find(
    (block) =>
      compatibleBlock(block, type) &&
      !usedIds.has(block.id) &&
      !reservedIds.has(block.id),
  );

  if (candidate) {
    usedIds.add(candidate.id);
    return candidate.id;
  }

  const id = createIdentifier(usedIds, reservedIds);
  usedIds.add(id);
  return id;
}

function reuseListItemId({
  itemIndex,
  listBlock,
  nodeId,
  reservedIds,
  usedIds,
}: {
  itemIndex: number;
  listBlock: Extract<ContentBlock, { type: "list" }> | undefined;
  nodeId?: string | null;
  reservedIds: Set<string>;
  usedIds: Set<string>;
}): string {
  if (
    nodeId &&
    !usedIds.has(nodeId) &&
    !reservedIds.has(nodeId)
  ) {
    usedIds.add(nodeId);
    return nodeId;
  }

  const candidate = listBlock?.items[itemIndex];

  if (
    candidate &&
    !usedIds.has(candidate.id) &&
    !reservedIds.has(candidate.id)
  ) {
    usedIds.add(candidate.id);
    return candidate.id;
  }

  const id = createIdentifier(usedIds, reservedIds);
  usedIds.add(id);
  return id;
}

function readStructuredBlock(
  node: UnknownRecord,
  expectedType: ContentBlock["type"],
): ContentBlock | null {
  const block = asRecord(node.block);

  if (
    !block ||
    block.type !== expectedType ||
    typeof block.id !== "string"
  ) {
    return null;
  }

  return block as ContentBlock;
}

export function lexicalStateToContentDocument(
  value: unknown,
  previousDocument?: ContentDocument,
): ContentDocument {
  const root = asRecord(asRecord(value)?.root);
  const children = Array.isArray(root?.children) ? root.children : [];
  const nodes = children
    .map(asRecord)
    .filter((node): node is UnknownRecord => node !== null);
  const reservedIds = new Set<string>();

  for (const node of nodes) {
    const type = blockKind(node);
    if (
      type === "image" ||
      type === "youtube" ||
      type === "callout" ||
      type === "references"
    ) {
      const block = asRecord(node.block);
      if (typeof block?.id === "string") {
        reservedIds.add(block.id);
      }
      if (block?.type === "references" && Array.isArray(block.items)) {
        block.items.forEach((candidate) => {
          const item = asRecord(candidate);
          if (typeof item?.id === "string") {
            reservedIds.add(item.id);
          }
        });
      }
    }
  }

  const usedIds = new Set<string>();
  const blocks: ContentBlock[] = [];

  nodes.forEach((node, index) => {
    const type = blockKind(node);
    if (!type) {
      const content = inlineFromNode(node);
      if (!hasReadableText(content)) return;

      blocks.push({
        content,
        id: reuseBlockId({
          index,
          nodeId: readNodeIdentifier(node),
          previousDocument,
          reservedIds,
          type: "paragraph",
          usedIds,
        }),
        type: "paragraph",
      });
      return;
    }

    if (
      type === "image" ||
      type === "youtube" ||
      type === "callout" ||
      type === "references"
    ) {
      const structuredBlock = readStructuredBlock(node, type);

      if (structuredBlock && !usedIds.has(structuredBlock.id)) {
        usedIds.add(structuredBlock.id);
        blocks.push(structuredBlock);
      }
      return;
    }

    if (type === "list") {
      const listItemNodes: UnknownRecord[] = [];

      function collectListItems(listNode: UnknownRecord) {
        const listChildren = Array.isArray(listNode.children)
          ? listNode.children
          : [];

        listChildren.forEach((candidate) => {
          const itemNode = asRecord(candidate);
          if (!itemNode || itemNode.type !== "listitem") return;
          listItemNodes.push(itemNode);

          const itemChildren = Array.isArray(itemNode.children)
            ? itemNode.children
            : [];
          itemChildren.forEach((child) => {
            const childNode = asRecord(child);
            if (childNode?.type === "list") collectListItems(childNode);
          });
        });
      }

      collectListItems(node);
      const previousList =
        previousDocument?.blocks[index]?.type === "list"
          ? previousDocument.blocks[index]
          : previousDocument?.blocks.find(
              (block) => block.type === "list" && !usedIds.has(block.id),
            );
      const items: ContentListItem[] = [];

      listItemNodes.forEach((itemNode, itemIndex) => {
        const directChildren = Array.isArray(itemNode.children)
          ? itemNode.children.filter(
              (candidate) => asRecord(candidate)?.type !== "list",
            )
          : [];
        const content: ContentInline[] = [];
        readChildren(directChildren, content);
        if (!hasReadableText(content)) return;

        items.push({
          content,
          id: reuseListItemId({
            itemIndex,
            listBlock: previousList?.type === "list" ? previousList : undefined,
            nodeId: readNodeIdentifier(itemNode),
            reservedIds,
            usedIds,
          }),
        });
      });

      if (!items.length) return;

      blocks.push({
        id: reuseBlockId({
          index,
          nodeId: readNodeIdentifier(node),
          previousDocument,
          reservedIds,
          type,
          usedIds,
        }),
        items,
        style:
          node.listType === "number" || node.tag === "ol"
            ? "ordered"
            : "unordered",
        type,
      });
      return;
    }

    const content = inlineFromNode(node);
    if (!hasReadableText(content)) return;
    const id = reuseBlockId({
      index,
      nodeId: readNodeIdentifier(node),
      previousDocument,
      reservedIds,
      type,
      usedIds,
    });

    if (type === "heading") {
      blocks.push({
        content,
        id,
        level: node.tag === "h1" || node.tag === "h2" ? 2 : 3,
        type,
      });
      return;
    }

    blocks.push({ content, id, type });
  });

  return {
    blocks,
    version: 1,
  };
}

export function validateEditorDocument(value: unknown): ContentDocument | null {
  const parsed = safeParseContentDocument(value);
  return parsed.success ? (parsed.data as ContentDocument) : null;
}
