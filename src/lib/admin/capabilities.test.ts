import assert from "node:assert/strict";
import test from "node:test";

import {
  adminCapabilities,
  hasAdminCapability,
  isAdminCapability,
  resolveAdminCapabilities,
} from "./capabilities.ts";

test("the exact admin role resolves every declared capability", () => {
  assert.deepEqual(resolveAdminCapabilities("admin"), adminCapabilities);
  assert.equal(hasAdminCapability("admin", "content.publish"), true);
  assert.equal(hasAdminCapability("admin", "events.publish"), true);
  assert.equal(hasAdminCapability("admin", "enrollments.update"), true);
  assert.equal(hasAdminCapability("admin", "evaluations.update"), true);
});

test("unknown and non-admin roles fail closed", () => {
  assert.deepEqual(resolveAdminCapabilities("premium"), []);
  assert.deepEqual(resolveAdminCapabilities("ADMIN"), []);
  assert.equal(hasAdminCapability("user", "content.read"), false);
  assert.equal(hasAdminCapability("admin", "content.delete"), false);
});

test("capability recognition accepts only the fixed capability tuple", () => {
  assert.equal(isAdminCapability("admin.access"), true);
  assert.equal(isAdminCapability("content.media.manage"), true);
  assert.equal(isAdminCapability("events.registrations.update"), true);
  assert.equal(isAdminCapability("enrollments.notifications.retry"), true);
  assert.equal(isAdminCapability("evaluations.read"), true);
  assert.equal(isAdminCapability("evaluations.notifications.retry"), true);
  assert.equal(isAdminCapability("content.delete"), false);
  assert.equal(isAdminCapability(null), false);
});
