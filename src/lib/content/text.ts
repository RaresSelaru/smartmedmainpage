import type { ContentDocument, ContentInline } from "@/lib/content/types";

export function inlineContentToPlainText(content: ContentInline[]): string {
  return content.map((run) => run.text).join("");
}

export function contentDocumentToPlainText(document: ContentDocument): string {
  return document.blocks
    .flatMap((block) => {
      if ("content" in block) {
        return inlineContentToPlainText(block.content);
      }

      if (block.type === "list") {
        return block.items.map((item) => inlineContentToPlainText(item.content));
      }

      if (block.type === "image") {
        return [block.alt, block.caption, block.credit].filter(Boolean);
      }

      if (block.type === "youtube") {
        return [block.title, block.summary].filter(Boolean);
      }

      return [
        block.title,
        ...block.items.flatMap((item) => [item.label, item.note]),
      ].filter(Boolean);
    })
    .join("\n")
    .replace(/\s+/gu, " ")
    .trim();
}

export function estimateContentReadTime(document: ContentDocument): string {
  const words = contentDocumentToPlainText(document).split(/\s+/u).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}
