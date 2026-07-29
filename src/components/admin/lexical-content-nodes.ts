"use client";

import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  DecoratorNode,
  type DOMExportOutput,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";

import { contentBlockSchema } from "@/lib/content/schema";
import type {
  CalloutBlock,
  ImageBlock,
  ReferencesBlock,
  YouTubeBlock,
} from "@/lib/content/types";

type StructuredContentBlock =
  | CalloutBlock
  | ImageBlock
  | ReferencesBlock
  | YouTubeBlock;

type SerializedStructuredNode<Block extends StructuredContentBlock> = Spread<
  {
    block: Block;
  },
  SerializedLexicalNode
>;

export type SerializedSmartMedImageNode =
  SerializedStructuredNode<ImageBlock> & {
    type: "smartmed-image";
  };

export type SerializedSmartMedYouTubeNode =
  SerializedStructuredNode<YouTubeBlock> & {
    type: "smartmed-youtube";
  };

export type SerializedSmartMedCalloutNode =
  SerializedStructuredNode<CalloutBlock> & {
    type: "smartmed-callout";
  };

export type SerializedSmartMedReferencesNode =
  SerializedStructuredNode<ReferencesBlock> & {
    type: "smartmed-references";
  };

function parseStructuredBlock<
  Type extends StructuredContentBlock["type"],
>(
  value: unknown,
  expectedType: Type,
): Extract<StructuredContentBlock, { type: Type }> {
  const parsed = contentBlockSchema.safeParse(value);

  if (!parsed.success || parsed.data.type !== expectedType) {
    throw new Error(`Blocul Lexical SmartMed ${expectedType} este invalid.`);
  }

  return parsed.data as Extract<StructuredContentBlock, { type: Type }>;
}

abstract class SmartMedStructuredNode<
  Block extends StructuredContentBlock,
> extends DecoratorNode<null> {
  protected __block: Block;

  constructor(block: Block, key?: NodeKey) {
    super(key);
    this.__block = block;
  }

  afterCloneFrom(previous: this): void {
    super.afterCloneFrom(previous);
    this.__block = previous.__block;
  }

  createDOM(): HTMLElement {
    const element = document.createElement("div");
    element.hidden = true;
    element.dataset.smartmedEditorNode = this.__block.type;
    return element;
  }

  decorate(): null {
    return null;
  }

  exportDOM(): DOMExportOutput {
    // Public and preview rendering always consume ContentDocument directly.
    // Structured editor nodes deliberately have no HTML serialization path.
    return { element: null };
  }

  getBlock(): Block {
    return this.getLatest().__block;
  }

  isInline(): false {
    return false;
  }

  updateDOM(): false {
    return false;
  }
}

export class SmartMedImageNode extends SmartMedStructuredNode<ImageBlock> {
  static getType(): string {
    return "smartmed-image";
  }

  static clone(node: SmartMedImageNode): SmartMedImageNode {
    return new SmartMedImageNode(node.__block, node.__key);
  }

  static importDOM(): null {
    return null;
  }

  static importJSON(
    serializedNode: SerializedSmartMedImageNode,
  ): SmartMedImageNode {
    return new SmartMedImageNode(
      parseStructuredBlock(serializedNode.block, "image"),
    );
  }

  exportJSON(): SerializedSmartMedImageNode {
    return {
      ...super.exportJSON(),
      block: this.getBlock(),
      type: "smartmed-image",
      version: 1,
    };
  }
}

export class SmartMedYouTubeNode extends SmartMedStructuredNode<YouTubeBlock> {
  static getType(): string {
    return "smartmed-youtube";
  }

  static clone(node: SmartMedYouTubeNode): SmartMedYouTubeNode {
    return new SmartMedYouTubeNode(node.__block, node.__key);
  }

  static importDOM(): null {
    return null;
  }

  static importJSON(
    serializedNode: SerializedSmartMedYouTubeNode,
  ): SmartMedYouTubeNode {
    return new SmartMedYouTubeNode(
      parseStructuredBlock(serializedNode.block, "youtube"),
    );
  }

  exportJSON(): SerializedSmartMedYouTubeNode {
    return {
      ...super.exportJSON(),
      block: this.getBlock(),
      type: "smartmed-youtube",
      version: 1,
    };
  }
}

export class SmartMedCalloutNode extends SmartMedStructuredNode<CalloutBlock> {
  static getType(): string {
    return "smartmed-callout";
  }

  static clone(node: SmartMedCalloutNode): SmartMedCalloutNode {
    return new SmartMedCalloutNode(node.__block, node.__key);
  }

  static importDOM(): null {
    return null;
  }

  static importJSON(
    serializedNode: SerializedSmartMedCalloutNode,
  ): SmartMedCalloutNode {
    return new SmartMedCalloutNode(
      parseStructuredBlock(serializedNode.block, "callout"),
    );
  }

  exportJSON(): SerializedSmartMedCalloutNode {
    return {
      ...super.exportJSON(),
      block: this.getBlock(),
      type: "smartmed-callout",
      version: 1,
    };
  }
}

export class SmartMedReferencesNode extends SmartMedStructuredNode<ReferencesBlock> {
  static getType(): string {
    return "smartmed-references";
  }

  static clone(node: SmartMedReferencesNode): SmartMedReferencesNode {
    return new SmartMedReferencesNode(node.__block, node.__key);
  }

  static importDOM(): null {
    return null;
  }

  static importJSON(
    serializedNode: SerializedSmartMedReferencesNode,
  ): SmartMedReferencesNode {
    return new SmartMedReferencesNode(
      parseStructuredBlock(serializedNode.block, "references"),
    );
  }

  exportJSON(): SerializedSmartMedReferencesNode {
    return {
      ...super.exportJSON(),
      block: this.getBlock(),
      type: "smartmed-references",
      version: 1,
    };
  }
}

export const approvedSmartMedLexicalNodes = [
  LinkNode,
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  SmartMedImageNode,
  SmartMedYouTubeNode,
  SmartMedCalloutNode,
  SmartMedReferencesNode,
] as const;
