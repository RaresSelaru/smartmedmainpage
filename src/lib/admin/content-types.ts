import type {
  ContentDocument,
  ContentKind,
  EditorialSnapshotV1,
} from "@/lib/content/types";
import type { AdminContentStatus } from "@/lib/admin/content-filters";

export type AdminContentListItem = {
  authorId: number | null;
  channelPublic: boolean;
  hasUnpublishedChanges: boolean;
  id: number;
  kind: ContentKind;
  publishedAt: string | null;
  publishedRevisionId: number | null;
  slug: string;
  status: AdminContentStatus;
  title: string;
  updatedAt: string;
  visibility: string;
  workingRevisionId: number | null;
  workingRevisionNo: number | null;
};

export type AdminContentListPage = {
  items: AdminContentListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminContentRevision = {
  body: ContentDocument;
  changeSummary: string | null;
  createdAt: string;
  createdBy: string | null;
  id: number;
  revisionNo: number;
  schemaVersion: number;
  snapshot: EditorialSnapshotV1;
};

export type AdminRevisionHistoryItem = {
  changeSummary: string | null;
  createdAt: string;
  createdBy: string | null;
  id: number;
  isPublished: boolean;
  isWorking: boolean;
  revisionNo: number;
  schemaVersion: number;
};

export type AdminContentDetail = {
  entry: {
    channelPublic: boolean;
    createdAt: string;
    id: number;
    kind: ContentKind;
    publishedAt: string | null;
    publishedRevisionId: number | null;
    status: AdminContentStatus;
    updatedAt: string;
    visibility: string;
    workingRevisionId: number | null;
  };
  history: AdminRevisionHistoryItem[];
  publishedRevision: AdminContentRevision | null;
  workingRevision: AdminContentRevision;
};

export type AdminContentEditorOption = {
  id: number;
  name: string;
};

export type AdminContentEditorOptions = {
  categories: AdminContentEditorOption[];
  tags: AdminContentEditorOption[];
};

export type AdminRevisionPreview = {
  entryId: number;
  isPublished: boolean;
  isWorking: boolean;
  kind: ContentKind;
  revision: AdminContentRevision;
  status: AdminContentStatus;
};

export type CmsMutationReceipt = {
  changed: boolean;
  entryId: number;
  newSlug: string | null;
  oldSlug: string | null;
  revisionId: number | null;
  workingRevisionId: number | null;
};
