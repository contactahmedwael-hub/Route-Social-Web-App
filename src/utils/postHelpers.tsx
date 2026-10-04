import type { Post, User } from "../types";

/**
 * These getters exist because the exact response shape for posts/users
 * hasn't been confirmed yet (Create Post / Get Single Post are coming in
 * a later step). Centralizing the field lookups here means only this file
 * needs an update once the real shape is confirmed, instead of every
 * component that renders a post.
 */

export function formatRelativeTime(dateInput?: string | null): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return date.toLocaleDateString();
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function getPostAuthor(post?: Post | null): User | null {
  return post?.user || post?.owner || post?.author || post?.createdBy || null;
}

export function getPostText(post?: Post | null): string {
  return (post?.body ?? post?.content ?? post?.text ?? post?.caption ?? "") as string;
}

export function getPostImage(post?: Post | null): string | null {
  return (post?.image || post?.photo || post?.media?.[0]?.url || null) as string | null;
}

export function getPostCreatedAt(post?: Post | null): string | null {
  return (post?.createdAt || post?.created_at || post?.date || null) as string | null;
}

export function getPostPrivacy(post?: Post | null): string {
  return (post?.privacy || post?.visibility || "Public") as string;
}

export function getCount(value: unknown): number {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.length;
  return 0;
}

export function getPostId(post?: Post | null): string {
  return (post?._id || post?.id || "") as string;
}

export function getSharedPost(post?: Post | null): Post | null {
  const ref = post?.sharedPost || post?.originalPost || post?.repost || null;
  return typeof ref === "object" ? (ref as Post) : null;
}

// A share record from the API may only carry the original post's id rather
// than the full nested object — this resolves either shape and returns just
// the id string when there's no embedded object (so callers know to fetch it).
export function getSharedPostRefId(post?: Post | null): string | null {
  const ref = post?.sharedPost || post?.originalPost || post?.repost;
  if (typeof ref === "string") return ref;
  if (ref && typeof ref === "object") return getPostId(ref as Post) || null;
  const idOnly =
    post?.sharedPostId || post?.originalPostId || post?.repostId || post?.sharedPost;
  return typeof idOnly === "string" ? idOnly : null;
}

export function getIsLiked(post?: Post | null): boolean {
  return Boolean(post?.isLiked ?? post?.liked ?? post?.likedByMe ?? false);
}

export function getIsBookmarked(post?: Post | null): boolean {
  return Boolean(post?.isBookmarked ?? post?.bookmarked ?? post?.savedByMe ?? false);
}

export function getIsFollowing(user?: User | null): boolean {
  return Boolean(user?.isFollowing ?? user?.followedByMe ?? user?.isFollowedByMe ?? false);
}

export function getUserId(user?: User | null): string {
  return (user?._id || user?.id || "") as string;
}

export function getProfilePath(user?: User | null, currentUserId?: string | null): string {
  const id = getUserId(user);
  if (!id) {
    if (user) {
      console.warn("getProfilePath: this user object has no _id/id, so it can't link to a profile:", user);
    }
    return "#";
  }
  return id === currentUserId ? "/profile" : `/profile/${id}`;
}

export function getFollowersCount(user?: User | null): number {
  return getCount(
    user?.followersCount ??
      user?.followerCount ??
      user?.numFollowers ??
      user?.totalFollowers ??
      user?.followers
  );
}

export function getFollowingCount(user?: User | null): number {
  return getCount(
    user?.followingCount ??
      user?.followingsCount ??
      user?.numFollowing ??
      user?.totalFollowing ??
      user?.following
  );
}

// No cover-photo upload endpoint has been provided, but a GET profile
// response might still include one read-only — check for it before
// falling back to the static gradient banner.
export function getUserCover(user?: User | null): string | null {
  return (user?.coverPhoto ||
    user?.cover ||
    user?.coverImage ||
    user?.coverPicture ||
    user?.banner ||
    null) as string | null;
}

export function getUserAvatar(user?: User | null): string | null {
  return (user?.profilePhoto || user?.photo || user?.avatar || user?.image || null) as
    | string
    | null;
}

export function getUserName(user?: User | null): string {
  return (user?.name || user?.fullName || user?.username || "Unknown") as string;
}

export function getUserHandle(user?: User | null): string {
  return user?.username ? `@${user.username}` : "";
}