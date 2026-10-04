import type { Notification, User } from "../types";
import { getPostId, getPostText, getUserId, getUserName } from "./postHelpers";

/**
 * The notifications payload shape isn't documented beyond the endpoints, so
 * every lookup below checks the likely field names. If the real response uses
 * something else, this is the only file that needs to change.
 */

export function extractNotifications(data: any): Notification[] {
  const candidates = [
    data?.notifications,
    data?.data?.notifications,
    data?.data,
    data?.results,
    data,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  if (data) {
    console.warn(
      "extractNotifications: request succeeded but no notification array was found in this response shape:",
      data
    );
  }
  return [];
}

/**
 * Works out whether another page exists. Uses the pagination metadata when
 * the API sends it, otherwise assumes "a full page means there may be more".
 */
export function extractHasMore(data: any, receivedCount: number, limit: number): boolean {
  const meta =
    data?.meta?.pagination ??
    data?.meta ??
    data?.pagination ??
    data?.data?.meta ??
    data?.data?.pagination;

  if (meta && typeof meta === "object") {
    if ("nextPage" in meta) return Boolean(meta.nextPage);
    const current = Number(meta.currentPage ?? meta.page);
    const total = Number(meta.numberOfPages ?? meta.totalPages ?? meta.pages);
    if (Number.isFinite(current) && Number.isFinite(total) && total > 0) {
      return current < total;
    }
  }
  return receivedCount >= limit;
}

export function extractUnreadCount(data: any): number {
  const candidates = [
    data?.unreadCount,
    data?.count,
    data?.data?.unreadCount,
    data?.data?.count,
    data?.data,
    data,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return Math.max(0, candidate);
    }
  }
  return 0;
}

export function getNotificationId(n?: Notification | null): string {
  return (n?._id || n?.id || "") as string;
}

export function getNotificationActor(n?: Notification | null): User | null {
  const actor = n?.actor || n?.sender || n?.from || n?.user || n?.createdBy;
  return actor && typeof actor === "object" ? (actor as User) : null;
}

export function isNotificationRead(n?: Notification | null): boolean {
  if (typeof n?.isRead === "boolean") return n.isRead;
  if (typeof n?.read === "boolean") return n.read;
  return Boolean(n?.readAt);
}

export type NotificationKind = "like" | "comment" | "reply" | "share" | "follow" | "other";

export function getNotificationKind(n?: Notification | null): NotificationKind {
  const type = String(n?.type ?? "").toLowerCase();
  if (type.includes("like")) return "like";
  if (type.includes("reply")) return "reply";
  if (type.includes("comment")) return "comment";
  if (type.includes("share")) return "share";
  if (type.includes("follow")) return "follow";
  return "other";
}

const ACTION_TEXT: Record<NotificationKind, string> = {
  like: "liked your post",
  comment: "commented on your post",
  reply: "replied to your comment",
  share: "shared your post",
  follow: "started following you",
  other: "sent you a notification",
};

/** Returns the actor's name and the action, so the page can bold the name. */
export function getNotificationParts(n?: Notification | null): {
  actorName: string;
  action: string;
} {
  const actor = getNotificationActor(n);
  const kind = getNotificationKind(n);
  const message = (n?.message ?? n?.text ?? n?.body) as string | undefined;

  if (kind === "other" && message) return { actorName: "", action: message };
  return {
    actorName: actor ? getUserName(actor) : "",
    action: ACTION_TEXT[kind],
  };
}

/** Where clicking the notification should go (null when there's nowhere to go). */
export function getNotificationLink(n?: Notification | null): string | null {
  const kind = getNotificationKind(n);

  if (kind === "follow") {
    const actorId = getUserId(getNotificationActor(n));
    return actorId ? `/profile/${actorId}` : null;
  }

  const post = n?.post;
  const postId =
    (typeof post === "string" ? post : post ? getPostId(post) : "") ||
    (n?.postId as string | undefined) ||
    (n?.entityId as string | undefined) ||
    "";
  return postId ? `/posts/${postId}` : null;
}

/**
 * The grey line under the headline: the post (or comment) the notification is
 * about. For follows the reference shows the follower's name instead.
 */
export function getNotificationPreview(n?: Notification | null): string {
  if (getNotificationKind(n) === "follow") {
    const actor = getNotificationActor(n);
    return actor ? getUserName(actor) : "";
  }

  const post = n?.post;
  if (post && typeof post === "object") {
    const text = getPostText(post);
    if (text) return text;
  }

  const entity = n?.entity as Record<string, unknown> | undefined;
  const candidates = [
    n?.preview,
    n?.postBody,
    n?.commentText,
    entity?.body,
    entity?.content,
    entity?.text,
    entity?.title,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return "";
}

/**
 * Combines several lists into one: duplicates (same id) are dropped, keeping
 * the first one seen, and the result is sorted newest first. Items with no
 * date keep their relative order.
 */
export function mergeNotifications(...groups: Notification[][]): Notification[] {
  const seen = new Set<string>();
  const merged: Notification[] = [];
  for (const group of groups) {
    for (const n of group) {
      const id = getNotificationId(n);
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      merged.push(n);
    }
  }
  const time = (n: Notification) => Date.parse(String(n.createdAt ?? ""));
  return merged.sort((a, b) => {
    const ta = time(a);
    const tb = time(b);
    return Number.isNaN(ta) || Number.isNaN(tb) ? 0 : tb - ta;
  });
}   