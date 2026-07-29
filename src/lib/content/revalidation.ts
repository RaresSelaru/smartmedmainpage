export type PublicBlogInvalidation = {
  newSlug?: string | null;
  oldSlug?: string | null;
};

const safeSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function getPublicBlogRevalidationPaths({
  newSlug,
  oldSlug,
}: PublicBlogInvalidation = {}): string[] {
  const paths = ["/blog", "/cautare", "/sitemap.xml"];

  for (const slug of [oldSlug, newSlug]) {
    if (slug && safeSlugPattern.test(slug)) {
      paths.push(`/blog/${slug}`);
    }
  }

  return [...new Set(paths)];
}
