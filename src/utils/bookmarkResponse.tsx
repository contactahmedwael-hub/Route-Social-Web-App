import type { Post } from "../types";

/**
 * GET /users/bookmarks — a dedicated extractor instead of reusing the
 * generic extractPosts(). Sharing one extractor between "all posts" and
 * "bookmarks" was the bug: extractPosts checks a generic `posts` key before
 * `bookmarks`, so if this endpoint's envelope carries any array under a
 * `posts`-like key (or nests differently), Saved could end up rendering the
 * wrong list — which is exactly what looked like "Saved shows everything,
 * like Community".
 *
 * This checks `bookmarks` first, and unwraps each entry in case a bookmark
 * is returned as its own document wrapping the real post under `post`
 * rather than being the post itself.
 */
export function extractBookmarks(data: any): Post[] {
  const candidates = [
    data?.bookmarks,
    data?.data?.bookmarks,
    data?.data,
    data?.results,
    data?.posts,
    data,
  ];

  let list: any[] = [];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      list = candidate;
      break;
    }
  }

  if (list.length === 0 && data) {
    console.warn(
      "extractBookmarks: request succeeded but no bookmark array was found in this response shape — check the keys below:",
      data
    );
    return [];
  }

  return list.map((entry) =>
    entry && typeof entry === "object" && entry.post && typeof entry.post === "object"
      ? entry.post
      : entry
  );
}