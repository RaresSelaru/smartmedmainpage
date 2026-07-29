import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminMfaPath,
  isAdminPath,
  sanitizeAdminNextPath,
} from "./redirects.ts";

test("admin redirects preserve only internal admin paths", () => {
  assert.equal(
    sanitizeAdminNextPath("/admin/content?page=2#results"),
    "/admin/content?page=2#results",
  );
  assert.equal(sanitizeAdminNextPath("/blog"), "/admin");
  assert.equal(sanitizeAdminNextPath("//evil.example/admin"), "/admin");
  assert.equal(sanitizeAdminNextPath("/admin\\evil.example"), "/admin");
});

test("admin path recognition rejects lookalike prefixes", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/admin/content"), true);
  assert.equal(isAdminPath("/administrator"), false);
  assert.equal(isAdminPath("/admin-tools"), false);
});

test("the MFA redirect cannot point back to the MFA page", () => {
  assert.equal(buildAdminMfaPath("/admin/mfa?next=/admin/content"), "/admin/mfa?next=%2Fadmin");
  assert.equal(
    buildAdminMfaPath("/admin/content/42"),
    "/admin/mfa?next=%2Fadmin%2Fcontent%2F42",
  );
});
