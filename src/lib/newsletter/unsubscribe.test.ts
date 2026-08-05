import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNewsletterUnsubscribeUrl,
  parseNewsletterUnsubscribeToken,
} from "@/lib/newsletter/unsubscribe";

describe("newsletter unsubscribe links", () => {
  const token = "41000000-0000-4000-8000-000000000099";

  it("normalizes an opaque UUID token", () => {
    assert.equal(
      parseNewsletterUnsubscribeToken(`  ${token.toUpperCase()}  `),
      token,
    );
  });

  it("rejects malformed or missing values", () => {
    assert.equal(parseNewsletterUnsubscribeToken(undefined), null);
    assert.equal(parseNewsletterUnsubscribeToken("not-a-token"), null);
  });

  it("builds the canonical public link without leaking email data", () => {
    assert.equal(
      buildNewsletterUnsubscribeUrl(token, "https://smartmed.ro"),
      `https://smartmed.ro/newsletter/dezabonare?token=${token}`,
    );
  });
});
