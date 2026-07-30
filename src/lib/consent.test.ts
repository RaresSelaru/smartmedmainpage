import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCEPT_ALL_CONSENT,
  CONSENT_SCHEMA_VERSION,
  createConsentRecord,
  parseConsentRecord,
  REJECT_OPTIONAL_CONSENT,
  serializeConsentRecord,
  withEnabledConsentCategory,
} from "@/lib/consent";

test("consent records survive a cookie-safe serialization round trip", () => {
  const updatedAt = new Date("2026-07-29T10:30:00.000Z");
  const record = createConsentRecord(ACCEPT_ALL_CONSENT, "banner", updatedAt);
  const parsed = parseConsentRecord(serializeConsentRecord(record));

  assert.deepEqual(parsed, record);
  assert.equal(parsed?.version, CONSENT_SCHEMA_VERSION);
  assert.equal(parsed?.updatedAt, updatedAt.toISOString());
});

test("malformed, incomplete, and obsolete consent values require a new choice", () => {
  const incomplete = encodeURIComponent(
    JSON.stringify({
      version: CONSENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      source: "banner",
      choices: {
        necessary: true,
        analytics: false,
      },
    }),
  );
  const obsolete = encodeURIComponent(
    JSON.stringify({
      ...createConsentRecord(REJECT_OPTIONAL_CONSENT, "banner"),
      version: CONSENT_SCHEMA_VERSION + 1,
    }),
  );

  assert.equal(parseConsentRecord("%not-json"), null);
  assert.equal(parseConsentRecord(incomplete), null);
  assert.equal(parseConsentRecord(obsolete), null);
  assert.equal(parseConsentRecord(null), null);
});

test("granting embedded media changes only that optional category", () => {
  const choices = withEnabledConsentCategory(
    REJECT_OPTIONAL_CONSENT,
    "externalMedia",
  );

  assert.deepEqual(choices, {
    necessary: true,
    preferences: false,
    analytics: false,
    externalMedia: true,
    marketing: false,
  });
});
