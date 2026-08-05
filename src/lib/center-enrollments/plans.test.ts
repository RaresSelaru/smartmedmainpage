import assert from "node:assert/strict";
import test from "node:test";

import {
  CENTER_ENROLLMENT_PLANS,
  parseCenterEnrollmentPlan,
} from "@/lib/center-enrollments/plans";

for (const slug of [
  "online-esential",
  "centru-plus",
  "module-signature",
] as const) {
  test(`parseCenterEnrollmentPlan accepts ${slug}`, () => {
    assert.equal(parseCenterEnrollmentPlan(slug)?.slug, slug);
  });
}

test("parseCenterEnrollmentPlan uses only the first query value", () => {
  assert.deepEqual(
    parseCenterEnrollmentPlan(["centru-plus", "online-esential"]),
    CENTER_ENROLLMENT_PLANS["centru-plus"],
  );
});

for (const value of [undefined, "", "premium", "CENTRU-PLUS"]) {
  test(`parseCenterEnrollmentPlan rejects ${String(value)}`, () => {
    assert.equal(parseCenterEnrollmentPlan(value), null);
  });
}
