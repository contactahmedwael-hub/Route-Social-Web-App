import { useCallback, useEffect, useState } from "react";
import type { AxiosResponse } from "axios";
import type { Post } from "../types";
import { extractPosts } from "../utils/postResponse";

interface UsePostsResult {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  loading: boolean;
  error: string;
  refetch: () => void;
}

// Keyed by the caller's cacheKey, so leaving a tab and coming back shows the
// last-known list instantly instead of a blank loading state, while a fresh
// fetch still runs in the background to keep it current (stale-while-revalidate).
const postsCache = new Map<string, Post[]>();

/**
 * Runs `fetcher()` (an axios call) whenever `deps` change, and normalizes
 * the result into { posts, loading, error }. Also exposes `setPosts` (for
 * optimistic prepend/remove/update after create/delete/edit) and `refetch`.
 *
 * `cacheKey`, when given, seeds `posts` from the last result under that key
 * on mount (no loading flash on a revisit) and updates the cache whenever a
 * fetch succeeds. Omit it for lists that should always start empty/loading.
 *
 * `extract`, when given, overrides the default generic array-extraction —
 * use this for endpoints whose response shape differs from a plain post
 * list (e.g. bookmarks), so one endpoint's quirks can't leak into another's.
 */
export function usePosts(
  fetcher: () => Promise<AxiosResponse<any>>,
  deps: unknown[] = [],
  enabled = true,
  cacheKey?: string,
  extract: (data: any) => Post[] = extractPosts
): UsePostsResult {
  const cached = cacheKey ? postsCache.get(cacheKey) : undefined;
  const [posts, setPosts] = useState<Post[]>(cached ?? []);
  const [loading, setLoading] = useState(enabled && !cached);
  const [error, setError] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  const refetch = useCallback(() => setReloadIndex((i) => i + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    // Only show the loading state when there's nothing cached to display —
    // a cache hit revalidates quietly in the background.
    if (!(cacheKey && postsCache.has(cacheKey))) {
      setLoading(true);
    }
    setError("");

    fetcher()
      .then(({ data }) => {
        if (cancelled) return;
        const list = extract(data);
        setPosts(list);
        if (cacheKey) postsCache.set(cacheKey, list);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load posts right now.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadIndex, cacheKey, ...deps]);

  // Keep the cache in sync with optimistic local edits too (create/delete/
  // like-driven updates), so a revisit doesn't show stale pre-edit data.
  useEffect(() => {
    if (cacheKey) postsCache.set(cacheKey, posts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, cacheKey]);

  return { posts, setPosts, loading, error, refetch };
}