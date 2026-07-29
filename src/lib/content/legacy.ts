import {
  CONTENT_DOCUMENT_VERSION,
  type ContentBlock,
  type ContentDocument,
  type ContentReadIssue,
  type ContentReadResult,
} from "@/lib/content/types";
import {
  CONTENT_LIMITS,
  contentBlockSchema,
  contentDocumentSchema,
} from "@/lib/content/schema";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function readLegacyText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function legacyUuid(index: number, childIndex = 0): string {
  const suffix = String(index * 1_000 + childIndex + 1).padStart(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
}

function readLegacyBlockText(block: UnknownRecord, maxLength: number): string | null {
  const data = asRecord(block.data);
  return (
    readLegacyText(block.text, maxLength) ??
    readLegacyText(block.content, maxLength) ??
    readLegacyText(data?.text, maxLength) ??
    readLegacyText(data?.content, maxLength)
  );
}

function adaptLegacyBlock(value: unknown, index: number): ContentBlock | null {
  const block = asRecord(value);
  const type = readLegacyText(block?.type, 32)?.toLocaleLowerCase("ro-RO");

  if (!block || !type) {
    return null;
  }

  if (type === "paragraph") {
    const text = readLegacyBlockText(block, CONTENT_LIMITS.paragraph);
    return text
      ? {
          id: legacyUuid(index),
          type: "paragraph",
          content: [{ type: "text", text }],
        }
      : null;
  }

  if (type === "heading" || type === "header") {
    const text = readLegacyBlockText(block, CONTENT_LIMITS.heading);
    const data = asRecord(block.data);
    const levelValue = block.level ?? data?.level;

    return text
      ? {
          id: legacyUuid(index),
          type: "heading",
          level: levelValue === 3 ? 3 : 2,
          content: [{ type: "text", text }],
        }
      : null;
  }

  if (type !== "list") {
    return null;
  }

  const data = asRecord(block.data);
  const rawItems = block.items ?? data?.items;

  if (!Array.isArray(rawItems)) {
    return null;
  }

  const items = rawItems
    .slice(0, CONTENT_LIMITS.listItems)
    .map((item, childIndex) => {
      const itemRecord = asRecord(item);
      const text =
        readLegacyText(item, CONTENT_LIMITS.listItemText) ??
        readLegacyText(itemRecord?.content, CONTENT_LIMITS.listItemText) ??
        readLegacyText(itemRecord?.text, CONTENT_LIMITS.listItemText);

      return text
        ? {
            id: legacyUuid(index, childIndex + 1),
            content: [{ type: "text" as const, text }],
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!items.length) {
    return null;
  }

  const style = readLegacyText(block.style ?? data?.style, 32);

  return {
    id: legacyUuid(index),
    type: "list",
    style: style === "ordered" || style === "number" ? "ordered" : "unordered",
    items,
  };
}

function readV1Blocks(blocksValue: unknown): ContentReadResult {
  const issues: ContentReadIssue[] = [];
  const blocks: ContentBlock[] = [];

  if (!Array.isArray(blocksValue)) {
    return {
      document: { version: CONTENT_DOCUMENT_VERSION, blocks: [] },
      issues: [{ code: "invalid-document" }],
    };
  }

  for (const [blockIndex, candidate] of blocksValue
    .slice(0, CONTENT_LIMITS.blocks)
    .entries()) {
    const parsed = contentBlockSchema.safeParse(candidate);

    if (!parsed.success) {
      issues.push({ blockIndex, code: "invalid-block" });
      continue;
    }

    const nextDocument: ContentDocument = {
      version: CONTENT_DOCUMENT_VERSION,
      blocks: [...blocks, parsed.data as ContentBlock],
    };

    try {
      const bytes = new TextEncoder().encode(JSON.stringify(nextDocument)).byteLength;

      if (bytes > CONTENT_LIMITS.documentBytes) {
        issues.push({ blockIndex, code: "size-limit" });
        continue;
      }
    } catch {
      issues.push({ blockIndex, code: "invalid-block" });
      continue;
    }

    if (!contentDocumentSchema.safeParse(nextDocument).success) {
      issues.push({ blockIndex, code: "invalid-block" });
      continue;
    }

    const knownIds = new Set(
      blocks.flatMap((block) => [
        block.id,
        ...(block.type === "list" || block.type === "references"
          ? block.items.map((item) => item.id)
          : []),
      ]),
    );
    const candidateIds = [
      parsed.data.id,
      ...(parsed.data.type === "list" || parsed.data.type === "references"
        ? parsed.data.items.map((item) => item.id)
        : []),
    ];

    if (candidateIds.some((id, index) => knownIds.has(id) || candidateIds.indexOf(id) !== index)) {
      issues.push({ blockIndex, code: "invalid-block" });
      continue;
    }

    blocks.push(parsed.data as ContentBlock);
  }

  if (blocksValue.length > CONTENT_LIMITS.blocks) {
    issues.push({ blockIndex: CONTENT_LIMITS.blocks, code: "size-limit" });
  }

  return {
    document: { version: CONTENT_DOCUMENT_VERSION, blocks },
    issues,
  };
}

function readLegacyBlocks(value: unknown): ContentReadResult {
  if (!Array.isArray(value)) {
    return {
      document: { version: CONTENT_DOCUMENT_VERSION, blocks: [] },
      issues: [{ code: "invalid-document" }],
    };
  }

  const issues: ContentReadIssue[] = [];
  const blocks = value
    .slice(0, CONTENT_LIMITS.blocks)
    .map((candidate, blockIndex) => {
      const block = adaptLegacyBlock(candidate, blockIndex);

      if (!block) {
        issues.push({ blockIndex, code: "legacy-block-skipped" });
      }

      return block;
    })
    .filter((block): block is ContentBlock => block !== null);

  if (value.length > CONTENT_LIMITS.blocks) {
    issues.push({ blockIndex: CONTENT_LIMITS.blocks, code: "size-limit" });
  }

  return {
    document: { version: CONTENT_DOCUMENT_VERSION, blocks },
    issues,
  };
}

export function readStoredContentDocument(
  value: unknown,
  schemaVersion?: number | null,
): ContentReadResult {
  const record = asRecord(value);

  if (
    schemaVersion === CONTENT_DOCUMENT_VERSION ||
    record?.version === CONTENT_DOCUMENT_VERSION
  ) {
    return readV1Blocks(record?.blocks);
  }

  if (
    schemaVersion !== 0 &&
    Array.isArray(value) &&
    value.some((candidate) => {
      const block = asRecord(candidate);
      return typeof block?.id === "string" && typeof block?.type === "string";
    })
  ) {
    return readV1Blocks(value);
  }

  return readLegacyBlocks(value);
}
