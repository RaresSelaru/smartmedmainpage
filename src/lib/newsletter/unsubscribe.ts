const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseNewsletterUnsubscribeToken(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const token = value.trim();
  return uuidPattern.test(token) ? token.toLowerCase() : null;
}

export function buildNewsletterUnsubscribeUrl(
  token: string,
  siteUrl: string,
): string {
  const safeToken = parseNewsletterUnsubscribeToken(token);
  if (!safeToken) {
    throw new TypeError("Invalid newsletter unsubscribe token");
  }

  const url = new URL("/newsletter/dezabonare", siteUrl);
  url.searchParams.set("token", safeToken);
  return url.toString();
}
