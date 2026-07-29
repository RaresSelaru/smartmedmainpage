import assert from "node:assert/strict";
import test from "node:test";

import sharp from "sharp";

import {
  CmsMediaValidationError,
  getCmsImageConfig,
  processCmsImage,
} from "./cms-media.ts";

test("CMS image config applies safe defaults and hard caps", () => {
  assert.deepEqual(getCmsImageConfig({}), {
    maxBytes: 6 * 1024 * 1024,
    maxHeight: 4096,
    maxWidth: 4096,
  });

  assert.throws(
    () => getCmsImageConfig({ CMS_MAX_IMAGE_BYTES: `${11 * 1024 * 1024}` }),
    /invalidă/,
  );
});

test("accepted images are decoded, stripped and rendered as responsive WebP variants", async () => {
  const source = await sharp({
    create: {
      background: "#0d7774",
      channels: 3,
      height: 900,
      width: 1400,
    },
  })
    .jpeg()
    .withExif({ IFD0: { Copyright: "must be removed" } })
    .toBuffer();

  const processed = await processCmsImage({
    bytes: source,
    fileName: "articol.jpg",
    mimeType: "image/jpeg",
  });

  assert.equal(processed.originalFormat, "jpeg");
  assert.deepEqual(
    processed.variants.map((variant) => variant.key),
    ["640", "1280", "original"],
  );

  for (const variant of processed.variants) {
    assert.equal(variant.mimeType, "image/webp");
    assert.match(variant.checksumSha256, /^[a-f0-9]{64}$/);
    const metadata = await sharp(variant.bytes).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.icc, undefined);
  }
});

test("extension, MIME and magic-byte mismatches are rejected", async () => {
  const png = await sharp({
    create: {
      background: "#ffffff",
      channels: 3,
      height: 10,
      width: 10,
    },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    processCmsImage({
      bytes: png,
      fileName: "spoof.jpg",
      mimeType: "image/jpeg",
    }),
    (error) =>
      error instanceof CmsMediaValidationError &&
      error.code === "signature_mismatch",
  );
});

test("oversized and over-dimension images fail before persistence", async () => {
  const png = await sharp({
    create: {
      background: "#ffffff",
      channels: 3,
      height: 20,
      width: 20,
    },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    processCmsImage({
      bytes: png,
      config: {
        maxBytes: png.byteLength - 1,
        maxHeight: 100,
        maxWidth: 100,
      },
      fileName: "mare.png",
      mimeType: "image/png",
    }),
    (error) =>
      error instanceof CmsMediaValidationError &&
      error.code === "file_too_large",
  );

  await assert.rejects(
    processCmsImage({
      bytes: png,
      config: {
        maxBytes: 1024 * 1024,
        maxHeight: 10,
        maxWidth: 10,
      },
      fileName: "dimensiuni.png",
      mimeType: "image/png",
    }),
    (error) =>
      error instanceof CmsMediaValidationError &&
      error.code === "invalid_dimensions",
  );
});
