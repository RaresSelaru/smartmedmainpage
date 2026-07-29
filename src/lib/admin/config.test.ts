import assert from "node:assert/strict";
import test from "node:test";

import { resolveAdminMfaPolicy } from "./config.ts";

test("MFA enabled is valid for hosted and production environments", () => {
  assert.deepEqual(
    resolveAdminMfaPolicy({
      CMS_REQUIRE_ADMIN_MFA: "true",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NODE_ENV: "production",
    }),
    {
      isValid: true,
      localBypass: false,
      reason: null,
      required: true,
    },
  );
});

test("a missing or malformed MFA setting fails closed", () => {
  assert.equal(
    resolveAdminMfaPolicy({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NODE_ENV: "development",
    }).isValid,
    false,
  );
  assert.deepEqual(
    resolveAdminMfaPolicy({
      CMS_REQUIRE_ADMIN_MFA: "yes",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NODE_ENV: "development",
    }),
    {
      isValid: false,
      localBypass: false,
      reason: "invalid-requirement",
      required: true,
    },
  );
});

test("MFA bypass is accepted only for the exact local Supabase origins", () => {
  for (const origin of [
    "http://localhost:54321",
    "http://localhost:54321/",
    "http://127.0.0.1:54321",
  ]) {
    assert.deepEqual(
      resolveAdminMfaPolicy({
        CMS_REQUIRE_ADMIN_MFA: "false",
        NEXT_PUBLIC_SUPABASE_URL: origin,
        NODE_ENV: "development",
      }),
      {
        isValid: true,
        localBypass: true,
        reason: null,
        required: false,
      },
    );
  }
});

test("MFA bypass is rejected in production and for lookalike origins", () => {
  const unsafeEnvironments = [
    {
      CMS_REQUIRE_ADMIN_MFA: "false",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NODE_ENV: "production",
    },
    {
      CMS_REQUIRE_ADMIN_MFA: "false",
      NEXT_PUBLIC_SUPABASE_URL: "https://localhost:54321",
      NODE_ENV: "development",
    },
    {
      CMS_REQUIRE_ADMIN_MFA: "false",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321/rest/v1",
      NODE_ENV: "development",
    },
    {
      CMS_REQUIRE_ADMIN_MFA: "false",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost.evil.test:54321",
      NODE_ENV: "test",
    },
  ];

  for (const environment of unsafeEnvironments) {
    const policy = resolveAdminMfaPolicy(environment);

    assert.equal(policy.isValid, false);
    assert.equal(policy.required, true);
    assert.equal(policy.localBypass, false);
  }
});
