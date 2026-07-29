import "server-only";

import { revalidatePath, updateTag } from "next/cache";

import {
  getPublicBlogRevalidationPaths,
  type PublicBlogInvalidation,
} from "@/lib/content/revalidation";

export const PUBLIC_BLOG_CACHE_TAG = "public-blog";
export const PUBLIC_BLOG_REVALIDATE_SECONDS = 60;

export { getPublicBlogRevalidationPaths };

/**
 * Call only after a committed Blog lifecycle mutation and from inside a
 * Server Action. Next.js restricts updateTag() to the Server Action context.
 */
export function invalidatePublicBlogCache(input: PublicBlogInvalidation = {}): void {
  updateTag(PUBLIC_BLOG_CACHE_TAG);

  for (const path of getPublicBlogRevalidationPaths(input)) {
    revalidatePath(path);
  }
}
