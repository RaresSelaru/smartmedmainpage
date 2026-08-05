import assert from "node:assert/strict";
import test from "node:test";

import { oauthLoginSchema } from "./validation.ts";

test("social login accepts only the two configured providers", () => {
  assert.equal(
    oauthLoginSchema.safeParse({ next: "/cont", provider: "google" }).success,
    true,
  );
  assert.equal(
    oauthLoginSchema.safeParse({ next: "/cont", provider: "facebook" }).success,
    true,
  );
  assert.equal(
    oauthLoginSchema.safeParse({ next: "/cont", provider: "github" }).success,
    false,
  );
});
test("social login input rejects unexpected fields", () => {
  assert.equal(
    oauthLoginSchema.safeParse({
      next: "/cont",
      provider: "google",
      redirectTo: "https://evil.example",
    }).success,
    false,
  );
});
