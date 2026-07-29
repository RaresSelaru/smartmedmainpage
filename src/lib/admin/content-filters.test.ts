import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminContentListHref,
  parseAdminContentListFilters,
} from "./content-filters.ts";

test("content list filters accept only known values and positive IDs", () => {
  assert.deepEqual(
    parseAdminContentListFilters({
      author: "7",
      category: "3",
      kind: "news",
      page: "2",
      status: "draft",
    }),
    {
      authorId: 7,
      categoryId: 3,
      kind: "news",
      page: 2,
      status: "draft",
    },
  );
});

test("invalid filters fail to safe defaults", () => {
  assert.deepEqual(
    parseAdminContentListFilters({
      author: "-1",
      category: "no",
      kind: "page",
      page: "NaN",
      status: "scheduled",
    }),
    {
      authorId: null,
      categoryId: null,
      kind: null,
      page: 1,
      status: null,
    },
  );
});

test("content list links preserve active filters and omit page one", () => {
  const filters = parseAdminContentListFilters({
    kind: "blog",
    page: "4",
    status: "published",
  });

  assert.equal(
    buildAdminContentListHref(filters, { page: 5 }),
    "/admin/content?kind=blog&status=published&page=5",
  );
  assert.equal(
    buildAdminContentListHref(filters, { page: 1 }),
    "/admin/content?kind=blog&status=published",
  );
});
