import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminCmsMediaUrl,
  buildPublicCmsMediaUrl,
  getCmsMediaVariant,
} from "./cms-media-record.ts";

const objectId = "550e8400-e29b-41d4-a716-446655440000";
const metadata = {
  originalFileName: "imagine.jpg",
  originalFormat: "jpeg",
  variants: [
    {
      byteSize: 100,
      checksumSha256: "a".repeat(64),
      height: 360,
      key: "640",
      path: `cms/${objectId}/640.webp`,
      width: 640,
    },
    {
      byteSize: 200,
      checksumSha256: "b".repeat(64),
      height: 720,
      key: "original",
      path: `cms/${objectId}/original.webp`,
      width: 1280,
    },
  ],
  version: 1,
};

test("media records expose only allowlisted variants", () => {
  assert.equal(
    getCmsMediaVariant(metadata, "640")?.path,
    `cms/${objectId}/640.webp`,
  );
  assert.equal(getCmsMediaVariant(metadata, "1024"), null);
  assert.equal(
    getCmsMediaVariant({ ...metadata, variants: [{ path: "../secret" }] }, "640"),
    null,
  );
});

test("missing responsive widths fall back without upscaling the stored image", () => {
  const smallMetadata = {
    ...metadata,
    variants: [
      {
        byteSize: 80,
        checksumSha256: "c".repeat(64),
        height: 281,
        key: "original",
        path: `cms/${objectId}/original.webp`,
        width: 500,
      },
    ],
  };

  assert.equal(
    getCmsMediaVariant(smallMetadata, "640")?.path,
    `cms/${objectId}/original.webp`,
  );
  assert.equal(
    getCmsMediaVariant(metadata, "1280")?.path,
    `cms/${objectId}/original.webp`,
  );
});

test("public and admin URLs use stable numeric IDs and allowlisted variants", () => {
  assert.equal(buildPublicCmsMediaUrl(42, "1280"), "/media/cms/42/1280");
  assert.equal(buildAdminCmsMediaUrl(42), "/admin/media/42/original");
  assert.throws(() => buildPublicCmsMediaUrl(0));
});
