import type { ContentKind, DatabaseContentKind } from "@/lib/content/types";

export const CONTENT_CHANNELS = {
  blog: {
    databaseKind: "article",
    label: "Blog",
    publicPath: "/blog",
    publishingEnabled: true,
  },
  news: {
    databaseKind: "news",
    label: "News",
    publicPath: null,
    publishingEnabled: false,
  },
} as const satisfies Record<
  ContentKind,
  {
    databaseKind: DatabaseContentKind;
    label: string;
    publicPath: string | null;
    publishingEnabled: boolean;
  }
>;

export function toDatabaseContentKind(kind: ContentKind): DatabaseContentKind {
  return CONTENT_CHANNELS[kind].databaseKind;
}

export function fromDatabaseContentKind(kind: string): ContentKind | null {
  if (kind === "article") {
    return "blog";
  }

  if (kind === "news") {
    return "news";
  }

  return null;
}

export function isPublicContentKind(kind: ContentKind): boolean {
  return CONTENT_CHANNELS[kind].publishingEnabled;
}
