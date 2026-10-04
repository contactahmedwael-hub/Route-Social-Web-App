import type { User } from "../types";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

const looksLikeUser = (v: unknown): v is Obj =>
  isObj(v) && (typeof v.name === "string" || typeof v.username === "string");

// Breadth-first search (a few levels deep) for the first key matching one of
// `keys` (case-insensitive) whose value satisfies `accept`.
function deepFind(
  root: unknown,
  keys: string[],
  accept: (v: unknown) => boolean,
  maxDepth = 4
): unknown {
  const wanted = keys.map((k) => k.toLowerCase());
  let level: unknown[] = [root];
  for (let depth = 0; depth <= maxDepth && level.length; depth++) {
    const next: unknown[] = [];
    for (const node of level) {
      if (!isObj(node)) continue;
      for (const [k, v] of Object.entries(node)) {
        if (wanted.includes(k.toLowerCase()) && accept(v)) return v;
        if (isObj(v)) next.push(v);
      }
    }
    level = next;
  }
  return undefined;
}

const isCountLike = (v: unknown) => typeof v === "number" || Array.isArray(v);
const isUrlLike = (v: unknown) => typeof v === "string" && v.length > 0;

/**
 * The profile endpoints wrap the user in an envelope whose exact shape isn't
 * documented (e.g. { data: { user } } or { user, stats }). This locates the
 * user object wherever it sits, folds in any stats living beside it, and
 * fills in follower/following counts and a cover image found elsewhere in
 * the response.
 */
export function extractProfile(data: any): User | null {
  if (!data) return null;

  const envelope: Obj = isObj(data?.data) ? (data.data as Obj) : isObj(data) ? (data as Obj) : {};

  const candidates = [
    data?.user,
    data?.data?.user,
    data?.profile,
    data?.data?.profile,
    data?.data,
    data,
  ];
  let user: Obj | null = (candidates.find(looksLikeUser) as Obj | undefined) ?? null;

  if (!user) {
    // Last resort: first nested object that looks like a user.
    const found = deepFind(data, ["user", "profile", "data"], looksLikeUser);
    user = (found as Obj | undefined) ?? null;
  }

  if (!user) {
    console.warn("extractProfile: couldn't find a user object in this response:", data);
    return null;
  }

  // Scalar/array fields from the envelope (e.g. isFollowing, followersCount
  // beside the user object), overridden by the user object's own fields.
  const beside: Obj = {};
  for (const [k, v] of Object.entries(envelope)) {
    if (!isObj(v)) beside[k] = v;
  }
  const merged: Obj = { ...beside, ...user };

  const followers = deepFind(data, ["followersCount", "followerCount", "followers"], isCountLike);
  const following = deepFind(
    data,
    ["followingCount", "followingsCount", "following"],
    isCountLike
  );
  const cover = deepFind(
    data,
    ["coverPhoto", "coverImage", "coverPicture", "coverUrl", "cover", "banner"],
    isUrlLike
  );

  if (merged.followersCount === undefined && followers !== undefined) {
    merged.followersCount = followers;
  }
  if (merged.followingCount === undefined && following !== undefined) {
    merged.followingCount = following;
  }
  if (merged.coverPhoto === undefined && cover !== undefined) {
    merged.coverPhoto = cover;
  }

  return merged as User;
}