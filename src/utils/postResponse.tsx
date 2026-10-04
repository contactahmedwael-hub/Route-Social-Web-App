import type { Post } from "../types";

/**
 * Pulls a post array out of a list-endpoint response. The real shape isn't
 * confirmed yet, so this tries every common wrapper — including one level
 * of nesting under `data` (Route Academy-style APIs often shape responses
 * as { results, data: { posts: [...] } } or { data: [...] }).
 * If none of these match, it logs the raw response so the actual shape
 * can be confirmed and this list narrowed down.
 */
export function extractPosts(data: any): Post[] {
  const candidates = [
    data?.posts,
    data?.bookmarks,
    data?.data?.posts,
    data?.data?.bookmarks,
    data?.data,
    data?.results,
    data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (data) {
    console.warn(
      "extractPosts: request succeeded but no post array was found in this response shape — check the keys below and tell me which one holds the posts:",
      data
    );
  }
  return [];
}

/**
 * Pulls a single post out of a create/update/get-single response.
 */
export function extractPost(data: any): Post | null {
  const candidates = [data?.post, data?.data?.post, data?.data, data];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as Post;
    }
  }
  return null;
}
