import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPositiveIdList,
  parseOptionalPositiveId,
  parsePositiveIdList,
  parseStrictPositiveIdList,
  slugifyEditorialTitle,
} from "./content-form-utils.ts";

test("editorial titles produce canonical lowercase slugs", () => {
  assert.equal(
    slugifyEditorialTitle("Știință, Îngrijire & Medicină!"),
    "stiinta-ingrijire-medicina",
  );
});

test("identifier helpers discard invalid and duplicate values", () => {
  assert.deepEqual(parsePositiveIdList("4, 2, 4, -1, text"), [4, 2]);
  assert.equal(formatPositiveIdList([4, 2]), "4, 2");
  assert.equal(parseOptionalPositiveId("9"), 9);
  assert.equal(parseOptionalPositiveId("0"), null);
  assert.equal(parseOptionalPositiveId(""), null);
});

test("strict identifier parsing rejects malformed or oversized input", () => {
  assert.deepEqual(parseStrictPositiveIdList("4, 2, 4"), {
    ids: [4, 2],
    ok: true,
  });
  assert.deepEqual(parseStrictPositiveIdList(""), { ids: [], ok: true });
  assert.deepEqual(parseStrictPositiveIdList("4, text"), {
    ids: [],
    ok: false,
  });
  assert.deepEqual(
    parseStrictPositiveIdList(
      Array.from({ length: 101 }, (_, index) => index + 1).join(","),
    ),
    { ids: [], ok: false },
  );
});
