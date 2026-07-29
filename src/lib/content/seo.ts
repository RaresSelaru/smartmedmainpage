export function absoluteSiteUrl(siteUrl: string, pathOrUrl: string): string {
  return new URL(pathOrUrl, siteUrl).toString();
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</gu, "\\u003c")
    .replace(/>/gu, "\\u003e")
    .replace(/&/gu, "\\u0026")
    .replace(/\u2028/gu, "\\u2028")
    .replace(/\u2029/gu, "\\u2029");
}
