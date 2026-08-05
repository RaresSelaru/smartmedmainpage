import assert from "node:assert/strict";
import test from "node:test";

import {
  centerRegistrationHeadline,
  parseRegistrationContext,
} from "@/lib/registration-context";

test("parseRegistrationContext accepts only the supported contextual values", () => {
  assert.deepEqual(
    parseRegistrationContext({
      clasa: "11",
      flow: "simulare",
      source: "homepage-exerseaza",
    }),
    {
      flow: "simulare",
      grade: "11",
      source: "homepage-exerseaza",
    },
  );
});

test("parseRegistrationContext falls back safely for untrusted query values", () => {
  assert.deepEqual(
    parseRegistrationContext({
      clasa: "13",
      flow: "altceva",
      source: "<script>",
    }),
    { flow: "centru", grade: null, source: null },
  );
});

test("centerRegistrationHeadline contextualizes the grade journey", () => {
  assert.match(centerRegistrationHeadline("10").eyebrow, /Clasa a X-a/u);
  assert.match(centerRegistrationHeadline("12").description, /admitere/u);
});
