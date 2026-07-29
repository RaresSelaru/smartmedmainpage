import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessPremiumContent,
  getAccessRuleForPath,
  sanitizeInternalPath,
} from "./access-control.ts";

test("sanitizeInternalPath preserves valid internal routes", () => {
  assert.equal(
    sanitizeInternalPath("/cont?mode=creare-cont#formular"),
    "/cont?mode=creare-cont#formular",
  );
  assert.equal(sanitizeInternalPath("/blog/articol"), "/blog/articol");
});

test("sanitizeInternalPath rejects external and protocol-relative URLs", () => {
  assert.equal(sanitizeInternalPath("https://evil.example"), "/cont");
  assert.equal(sanitizeInternalPath("//evil.example/path"), "/cont");
});

test("sanitizeInternalPath rejects backslash URL normalization attacks", () => {
  assert.equal(sanitizeInternalPath("/\\evil.example"), "/cont");
  assert.equal(sanitizeInternalPath("/folder\\evil.example"), "/cont");
});

test("sanitizeInternalPath rejects control characters and invalid input", () => {
  assert.equal(sanitizeInternalPath("/cont\u0000"), "/cont");
  assert.equal(sanitizeInternalPath(""), "/cont");
  assert.equal(sanitizeInternalPath(null), "/cont");
});

test("premium access accepts active entitlements and administrator access", () => {
  assert.equal(
    canAccessPremiumContent({ hasPremiumAccess: true, role: "user" }),
    true,
  );
  assert.equal(canAccessPremiumContent({ hasPremiumAccess: false, role: "admin" }), true);
});

test("premium access rejects standard accounts without an entitlement", () => {
  assert.equal(
    canAccessPremiumContent({ hasPremiumAccess: false, role: "user" }),
    false,
  );
  assert.equal(canAccessPremiumContent("guest"), false);
});

test("admin routes receive an optimistic authenticated-session rule", () => {
  assert.equal(getAccessRuleForPath("/admin")?.path, "/admin");
  assert.equal(getAccessRuleForPath("/admin/content/42")?.path, "/admin");
  assert.equal(getAccessRuleForPath("/administrator"), null);
});
