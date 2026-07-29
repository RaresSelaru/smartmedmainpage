import assert from "node:assert/strict";
import test from "node:test";

import {
  CmsMediaUploadRequestError,
  isExactSameOriginRequest,
  parseCmsMediaUpload,
} from "./cms-media-upload";

test("same-origin upload requests require an exact Origin header", () => {
  assert.equal(
    isExactSameOriginRequest(
      new Request("https://smartmed.ro/admin/api/media", {
        headers: { origin: "https://smartmed.ro" },
      }),
    ),
    true,
  );
  assert.equal(
    isExactSameOriginRequest(
      new Request("https://smartmed.ro/admin/api/media", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    isExactSameOriginRequest(
      new Request("https://smartmed.ro/admin/api/media"),
    ),
    false,
  );
});

test("informative uploads require alt text and HTTPS sources", () => {
  const formData = new FormData();
  formData.set(
    "file",
    new File([new Uint8Array([1])], "example.png", { type: "image/png" }),
  );
  formData.set("source", "http://example.com/image");

  assert.throws(
    () => parseCmsMediaUpload(formData),
    (error: unknown) =>
      error instanceof CmsMediaUploadRequestError &&
      error.code === "invalid_metadata" &&
      Boolean(error.fieldErrors?.altText) &&
      Boolean(error.fieldErrors?.source),
  );
});

test("decorative uploads may omit alt text", () => {
  const formData = new FormData();
  formData.set(
    "file",
    new File([new Uint8Array([1])], "example.webp", { type: "image/webp" }),
  );
  formData.set("decorative", "true");
  formData.set("source", "https://example.com/image");

  const parsed = parseCmsMediaUpload(formData);

  assert.equal(parsed.metadata.decorative, true);
  assert.equal(parsed.metadata.altText, null);
});
