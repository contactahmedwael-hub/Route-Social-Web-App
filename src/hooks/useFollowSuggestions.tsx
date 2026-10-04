import { useEffect, useMemo, useRef, useState } from "react";
import { getSuggestions, getSuggestionsPage, toggleFollow } from "../api/userService";
import { getCount, getIsFollowing, getUserHandle, getUserName } from "../utils/postHelpers";
import type { User } from "../types";

export function getSuggestionId(u: User): string {
  return (u?._id || u?.id || "") as string;
}

function extractUserList(data: any): User[] {
  const candidates = [
    data?.suggestions,
    data?.users,
    data?.data?.suggestions,
    data?.data?.users,
    data?.data,
    data?.results,
    data,
  ];
  return candidates.find((c) => Array.isArray(c)) ?? [];
}

function followerCount(u: User): number {
  return getCount(u?.followersCount ?? u?.followers);
}

export function useFollowSuggestions(limit: number) {
  const [people, setPeople] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followingIds, setFollowingIds] = useState<Set<string>>(() => new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getSuggestions(limit)
      .then(({ data }) => {
        if (cancelled) return;
        const list: User[] = extractUserList(data);

        if (list.length === 0 && data) {
          console.warn(
            "useFollowSuggestions: request succeeded but no user array was found in this response shape — check the keys below:",
            data
          );
        }

        const sorted = [...list].sort((a, b) => followerCount(b) - followerCount(a));
        setPeople(sorted);
        setFollowingIds(
          new Set(
            sorted
              .filter(getIsFollowing)
              .map((p) => getSuggestionId(p))
              .filter(Boolean)
          )
        );
      })
      .catch(() => !cancelled && setError("Couldn't load suggestions."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const toggleFollowFor = async (userId: string) => {
    setPendingIds((prev) => new Set(prev).add(userId));
    try {
      await toggleFollow(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.has(userId) ? next.delete(userId) : next.add(userId);
        return next;
      });
    } catch {
      // silently ignore — the button just stays in its previous state
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return { people, loading, error, followingIds, pendingIds, toggleFollowFor };
}
// ---------------------------------------------------------------------------
// Searching users
//
// Searching has to reach EVERY user, not just the few the API hands out as
// suggestions. The reference site does that by letting the server do the
// searching, so this does the same: it sends the typed text to
// GET /users/suggestions as a query parameter.
//
// The docs don't say what that parameter is called, so the first search tries
// the likely names one by one and keeps the first one the server actually
// honours (its results mostly contain the typed text; a server that ignores
// the parameter returns unrelated people). The winner is remembered. If none
// works, it falls back to reading the whole suggestions directory page by
// page and filtering it here.
// ---------------------------------------------------------------------------

const SEARCH_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PARAM_CANDIDATES = [
  "search",
  "q",
  "query",
  "name",
  "keyword",
  "username",
  "term",
  "searchTerm",
  "text",
];
const SEARCH_PARAM_KEY = "rp_user_search_param";
const SEARCH_MIN_PROBE_LENGTH = 3; // short terms match too many random people to tell
const DIRECTORY_MAX_PAGES = 50;
const DIRECTORY_CACHE_MS = 60_000;

// string = the query parameter the server searches with
// null   = the server ignores every candidate (use the directory fallback)
// undefined = not found out yet
let serverSearchParam: string | null | undefined = (() => {
  try {
    return localStorage.getItem(SEARCH_PARAM_KEY) ?? undefined;
  } catch {
    return undefined;
  }
})();

function rememberSearchParam(param: string | null) {
  serverSearchParam = param;
  try {
    if (param) localStorage.setItem(SEARCH_PARAM_KEY, param);
    else localStorage.removeItem(SEARCH_PARAM_KEY);
  } catch {
    // storage unavailable — it will just be detected again next time
  }
  console.info(
    param
      ? `User search: the server searches with the "${param}" query parameter.`
      : "User search: the server ignored every search parameter tried; filtering the full directory instead."
  );
}

function matchesTerm(u: User, term: string): boolean {
  const haystack = `${getUserName(u)} ${getUserHandle(u)} ${u?.username ?? ""}`.toLowerCase();
  return haystack.includes(term);
}

// The API reports paging as meta.pagination = { currentPage, numberOfPages, nextPage, total }.
function extractHasNext(data: any, count: number): boolean {
  const pagination = data?.meta?.pagination;
  if (pagination && typeof pagination === "object") {
    if ("nextPage" in pagination) return Boolean(pagination.nextPage);
    const current = Number(pagination.currentPage);
    const total = Number(pagination.numberOfPages);
    if (Number.isFinite(current) && Number.isFinite(total) && total > 0) return current < total;
  }
  return count >= SEARCH_PAGE_SIZE;
}

async function fetchSearchPage(
  param: string,
  term: string,
  page: number
): Promise<{ list: User[]; hasNext: boolean }> {
  const { data } = await getSuggestionsPage(page, SEARCH_PAGE_SIZE, { [param]: term });
  const list = extractUserList(data);
  return { list, hasNext: extractHasNext(data, list.length) };
}

type ProbeResult =
  | { param: string; list: User[]; hasNext: boolean }
  | "ignored"
  | "inconclusive";

async function probeServerSearch(term: string): Promise<ProbeResult> {
  let sawIgnored = false;
  for (const param of SEARCH_PARAM_CANDIDATES) {
    try {
      const { list, hasNext } = await fetchSearchPage(param, term, 1);
      if (list.length === 0) continue; // no matches, or the name is wrong: can't tell
      const matching = list.filter((u) => matchesTerm(u, term)).length;
      if (matching * 2 >= list.length) return { param, list, hasNext };
      sawIgnored = true; // got unrelated people back, so this param does nothing
    } catch {
      // this name was rejected — try the next one
    }
  }
  return sawIgnored ? "ignored" : "inconclusive";
}

// Fallback: read every page of the suggestions directory once and cache it.
let directoryCache: { users: User[]; at: number } | null = null;
let directoryLoad: Promise<User[]> | null = null;

function freshDirectory(): User[] | null {
  return directoryCache && Date.now() - directoryCache.at < DIRECTORY_CACHE_MS
    ? directoryCache.users
    : null;
}

function loadDirectory(): Promise<User[]> {
  if (!directoryLoad) {
    directoryLoad = (async () => {
      const byId = new Map<string, User>();
      for (let page = 1; page <= DIRECTORY_MAX_PAGES; page++) {
        let list: User[];
        let hasNext: boolean;
        try {
          const { data } = await getSuggestionsPage(page, SEARCH_PAGE_SIZE);
          list = extractUserList(data);
          hasNext = extractHasNext(data, list.length);
        } catch (err) {
          if (page === 1) throw err;
          break;
        }
        let added = 0;
        for (const u of list) {
          const id = getSuggestionId(u);
          if (id && !byId.has(id)) {
            byId.set(id, u);
            added++;
          }
        }
        if (!hasNext || added === 0) break;
      }
      const users = Array.from(byId.values());
      directoryCache = { users, at: Date.now() };
      return users;
    })().finally(() => {
      directoryLoad = null;
    });
  }
  return directoryLoad;
}

export function useUserSearch(query: string) {
  const term = query.trim().toLowerCase();
  const active = term.length > 0;

  // Wait for a short pause in typing before hitting the API.
  const [debounced, setDebounced] = useState(term);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(term), term ? SEARCH_DEBOUNCE_MS : 0);
    return () => window.clearTimeout(id);
  }, [term]);

  const [mode, setMode] = useState<"server" | "directory">("server");
  const [serverResults, setServerResults] = useState<User[]>([]);
  const [directory, setDirectory] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [followingIds, setFollowingIds] = useState<Set<string>>(() => new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

  // Ignores answers from searches that have already been replaced by newer ones.
  const requestId = useRef(0);

  useEffect(() => {
    const myId = ++requestId.current;
    const stale = () => myId !== requestId.current;

    // Clearing the box clears everything, including any search error.
    if (!debounced) {
      setServerResults([]);
      setHasMore(false);
      setPage(1);
      setError("");
      setFetching(false);
      return;
    }

    setFetching(true);
    setError("");
    setPage(1);

    (async () => {
      try {
        let param = serverSearchParam;

        if (param === undefined && debounced.length >= SEARCH_MIN_PROBE_LENGTH) {
          const probe = await probeServerSearch(debounced);
          if (stale()) return;
          if (typeof probe === "object") {
            rememberSearchParam(probe.param);
            setMode("server");
            setServerResults(probe.list);
            setHasMore(probe.hasNext);
            return;
          }
          if (probe === "ignored") {
            rememberSearchParam(null);
            param = null;
          }
        }

        if (typeof param === "string") {
          const { list, hasNext } = await fetchSearchPage(param, debounced, 1);
          if (stale()) return;
          setMode("server");
          setServerResults(list);
          setHasMore(hasNext);
          return;
        }

        // No server-side search available: search the whole directory here.
        const users = freshDirectory() ?? (await loadDirectory());
        if (stale()) return;
        setMode("directory");
        setDirectory(users);
        setHasMore(false);
      } catch {
        if (!stale()) setError("Couldn't search users. Try again.");
      } finally {
        if (!stale()) setFetching(false);
      }
    })();
  }, [debounced]);

  const loadMore = async () => {
    if (mode !== "server" || typeof serverSearchParam !== "string" || loadingMore || !hasMore) {
      return;
    }
    const myId = requestId.current;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { list, hasNext } = await fetchSearchPage(serverSearchParam, debounced, next);
      if (myId !== requestId.current) return;
      setServerResults((prev) => {
        const seen = new Set(prev.map(getSuggestionId));
        return [...prev, ...list.filter((u) => !seen.has(getSuggestionId(u)))];
      });
      setPage(next);
      setHasMore(hasNext);
    } catch {
      // leave the list as it is; the button stays so it can be retried
    } finally {
      setLoadingMore(false);
    }
  };

  const results = useMemo(() => {
    if (!active) return [];
    return mode === "server" ? serverResults : directory.filter((p) => matchesTerm(p, term));
  }, [active, mode, serverResults, directory, term]);

  // Remember who the current user already follows, without losing follows
  // toggled during this session.
  useEffect(() => {
    const already = results.filter(getIsFollowing).map(getSuggestionId).filter(Boolean);
    if (already.length === 0) return;
    setFollowingIds((prev) => new Set([...prev, ...already]));
  }, [results]);

  const toggleFollowFor = async (userId: string) => {
    setPendingIds((prev) => new Set(prev).add(userId));
    try {
      await toggleFollow(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.has(userId) ? next.delete(userId) : next.add(userId);
        return next;
      });
    } catch {
      // silently ignore — the button just stays in its previous state
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const loading = active && (debounced !== term || fetching);

  return {
    results,
    loading,
    loadingMore,
    hasMore: active && hasMore,
    loadMore,
    error: active ? error : "",
    followingIds,
    pendingIds,
    toggleFollowFor,
  };
}