export type PublicCmsMediaWidth = 640 | 1280 | 1920 | "original";

export function getPublicCmsMediaPath(
  mediaId: number,
  width: PublicCmsMediaWidth = "original",
): string {
  if (!Number.isSafeInteger(mediaId) || mediaId <= 0) {
    throw new TypeError("mediaId must be a positive integer.");
  }

  return `/media/cms/${mediaId}/${width}`;
}
