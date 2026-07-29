export const CONTENT_DOCUMENT_VERSION = 1 as const;

export type ContentKind = "blog" | "news";
export type DatabaseContentKind = "article" | "news";

export type ContentTextRun = {
  type: "text";
  text: string;
  bold?: true;
  italic?: true;
};

export type ContentLinkRun = {
  type: "link";
  href: string;
  text: string;
  bold?: true;
  italic?: true;
};

export type ContentInline = ContentTextRun | ContentLinkRun;

export type ParagraphBlock = {
  id: string;
  type: "paragraph";
  content: ContentInline[];
};

export type HeadingBlock = {
  id: string;
  type: "heading";
  level: 2 | 3;
  content: ContentInline[];
};

export type ContentListItem = {
  id: string;
  content: ContentInline[];
};

export type ListBlock = {
  id: string;
  type: "list";
  style: "ordered" | "unordered";
  items: ContentListItem[];
};

export type BlockquoteBlock = {
  id: string;
  type: "blockquote";
  content: ContentInline[];
};

export type ImageBlock = {
  id: string;
  type: "image";
  mediaId: number;
  decorative: boolean;
  alt: string;
  caption?: string;
  credit?: string;
  source?: string;
  rights?: string;
};

export type YouTubeBlock = {
  id: string;
  type: "youtube";
  videoId: string;
  title: string;
  summary?: string;
};

export type CalloutBlock = {
  id: string;
  type: "callout";
  variant: "important" | "warning" | "medical-note";
  title?: string;
  content: ContentInline[];
};

export type ContentReferenceItem = {
  id: string;
  label: string;
  url?: string;
  note?: string;
};

export type ReferencesBlock = {
  id: string;
  type: "references";
  title?: string;
  items: ContentReferenceItem[];
};

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | BlockquoteBlock
  | ImageBlock
  | YouTubeBlock
  | CalloutBlock
  | ReferencesBlock;

export type ContentDocument = {
  version: typeof CONTENT_DOCUMENT_VERSION;
  blocks: ContentBlock[];
};

export type EditorialSnapshotV1 = {
  version: 1;
  title: string;
  slug: string;
  excerpt: string;
  authorId: number | null;
  coverMediaId: number | null;
  categoryIds: number[];
  tagIds: number[];
  seoTitle: string | null;
  seoDescription: string | null;
  publishedAt: string | null;
  reviewer: string | null;
  reviewDate: string | null;
  disclaimer: string | null;
  correctionNote: string | null;
  relatedEntryIds: number[];
};

export type PublicBlogSummary = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  category: import("@/lib/blog").BlogCategorySlug;
  tags: string[];
  publishedAt: string;
  modifiedAt: string;
  coverImage: string;
  coverAlt: string;
  readTime: string;
  author: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type PublicBlogPost = PublicBlogSummary & {
  document: ContentDocument;
  contentPreview: string;
  disclaimer: string | null;
  correctionNote: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
};

export type ContentReadIssue = {
  blockIndex?: number;
  code: "invalid-document" | "invalid-block" | "legacy-block-skipped" | "size-limit";
};

export type ContentReadResult = {
  document: ContentDocument;
  issues: ContentReadIssue[];
};
