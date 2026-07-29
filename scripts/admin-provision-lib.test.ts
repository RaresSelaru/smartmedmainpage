import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLocalAppUrl,
  assertLocalSupabaseUrl,
  publicTargetSummary,
  readHostedTarget,
  requireHostedExecution,
  validateLocalAdminPassword,
} from "./admin-provision-lib.ts";

test("local provisioning rejects hosted, lookalike and credential-bearing URLs", () => {
  assert.equal(
    assertLocalSupabaseUrl("http://127.0.0.1:54321"),
    "http://127.0.0.1:54321",
  );
  assert.equal(
    assertLocalSupabaseUrl("http://localhost:54321/"),
    "http://localhost:54321",
  );

  for (const unsafeUrl of [
    "https://project.supabase.co",
    "http://localhost.evil.example:54321",
    "http://user:password@localhost:54321",
    "http://localhost:54321/rest/v1",
  ]) {
    assert.throws(() => assertLocalSupabaseUrl(unsafeUrl));
  }

  assert.equal(assertLocalAppUrl("http://localhost:3000"), "http://localhost:3000");
  assert.throws(() => assertLocalAppUrl("https://smartmed.ro"));
});

test("local password validation is deliberately stronger than public signup", () => {
  assert.equal(
    validateLocalAdminPassword("Local-Admin-2026!"),
    "Local-Admin-2026!",
  );

  for (const weakPassword of [
    "short",
    "alllowercase123!",
    "ALLUPPERCASE123!",
    "NoDigitsPresent!",
    "NoSymbolsPresent123",
  ]) {
    assert.throws(() => validateLocalAdminPassword(weakPassword));
  }
});

test("hosted targets require exact project identity and redact secrets from summaries", () => {
  const environment = {
    ADMIN_BOOTSTRAP_ENVIRONMENT: "staging",
    ADMIN_CHANGE_REASON: "Provisionare aprobată",
    ADMIN_INVITE_REDIRECT_URL:
      "https://smartmed.ro/cont?mode=parola-noua",
    ADMIN_OPERATOR_REFERENCE: "CHANGE-123",
    BOOTSTRAP_ADMIN_EMAIL: "ADMIN@example.com",
    EXPECTED_SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
    SUPABASE_OPERATOR_SECRET_KEY: "must-not-be-returned",
    SUPABASE_PROJECT_REF: "abcdefghijklmnopqrst",
    SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  };

  const target = readHostedTarget(environment);
  assert.deepEqual(publicTargetSummary(target), {
    email: "admin@example.com",
    environment: "staging",
    projectRef: "abcdefghijklmnopqrst",
    supabaseUrl: "https://abcdefghijklmnopqrst.supabase.co",
  });
  assert.doesNotMatch(JSON.stringify(publicTargetSummary(target)), /must-not-be-returned/);

  assert.throws(() =>
    readHostedTarget({
      ...environment,
      SUPABASE_PROJECT_REF: "zzzzzzzzzzzzzzzzzzzz",
    }),
  );
  assert.throws(() =>
    readHostedTarget({
      ...environment,
      ADMIN_INVITE_REDIRECT_URL:
        "https://smartmed.ro/auth/callback?next=%2Fadmin%2Fmfa",
    }),
  );
  assert.throws(() =>
    readHostedTarget({
      ...environment,
      ADMIN_INVITE_REDIRECT_URL:
        "https://attacker.example/cont?mode=parola-noua",
    }),
  );
});

test("hosted mutations require an explicit exact execution flag", () => {
  assert.throws(() => requireHostedExecution({}));
  assert.throws(() => requireHostedExecution({ ADMIN_BOOTSTRAP_EXECUTE: "TRUE" }));
  assert.doesNotThrow(() =>
    requireHostedExecution({ ADMIN_BOOTSTRAP_EXECUTE: "true" }),
  );
});
