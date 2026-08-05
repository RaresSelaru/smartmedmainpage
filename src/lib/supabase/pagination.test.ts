import assert from "node:assert/strict";
import test from "node:test";

import { collectAllSupabasePages } from "@/lib/supabase/pagination";

test("collects every page, including an exact page-size boundary", async () => {
  const source = Array.from({ length: 1_000 }, (_, index) => index + 1);
  const calls: Array<[number, number]> = [];
  const result = await collectAllSupabasePages(
    (from, to) => {
      calls.push([from, to]);
      return Promise.resolve({ data: source.slice(from, to + 1), error: null });
    },
    500,
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.data, source);
  assert.deepEqual(calls, [
    [0, 499],
    [500, 999],
    [1_000, 1_499],
  ]);
});

test("stops and returns the first page error without partial data", async () => {
  const expectedError = { code: "query_failed" };
  const result = await collectAllSupabasePages(
    (from) =>
      Promise.resolve(
        from === 0
          ? { data: [1, 2], error: null }
          : { data: null, error: expectedError },
      ),
    2,
  );

  assert.equal(result.data, null);
  assert.equal(result.error, expectedError);
});

test("rejects invalid page sizes", async () => {
  await assert.rejects(
    () => collectAllSupabasePages(() => Promise.resolve({ data: [], error: null }), 0),
    RangeError,
  );
});
