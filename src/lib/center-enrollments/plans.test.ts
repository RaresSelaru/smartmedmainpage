import assert from "node:assert/strict";
import test from "node:test";

import {
  CENTER_ENROLLMENT_PLAN_SLUGS,
  CENTER_ENROLLMENT_PLANS,
  CURRENT_CENTER_ENROLLMENT_PLAN_SLUGS,
  LEGACY_CENTER_ENROLLMENT_PLAN_SLUGS,
  parseCenterEnrollmentPlan,
} from "@/lib/center-enrollments/plans";

test("the center enrollment catalog keeps legacy plans and exposes all six current plans", () => {
  assert.deepEqual(LEGACY_CENTER_ENROLLMENT_PLAN_SLUGS, [
    "online-esential",
    "centru-plus",
    "module-signature",
  ]);
  assert.deepEqual(CURRENT_CENTER_ENROLLMENT_PLAN_SLUGS, [
    "esential-1-materie",
    "esential-2-materii",
    "avansat-1-materie",
    "avansat-2-materii",
    "performanta-1-materie",
    "performanta-2-materii",
  ]);
});

for (const slug of CENTER_ENROLLMENT_PLAN_SLUGS) {
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
