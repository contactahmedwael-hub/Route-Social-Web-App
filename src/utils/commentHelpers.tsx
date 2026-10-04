import type { Comment, User } from "../types";
import { getCount } from "./postHelpers";

export function getCommentId(comment?: Comment | null): string {
  return (comment?._id || comment?.id || "") as string;
}

export function getCommentAuthor(comment?: Comment | null): User | null {
  const candidates = [
    comment?.commentCreator,
    comment?.user,
    comment?.owner,
    comment?.author,
    comment?.createdBy,
    comment?.commenter,
    comment?.postedBy,
    comment?.by,
    comment?.userId,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") return candidate as User;
  }

  // Some APIs flatten the author's fields directly onto the comment
  // instead of nesting a user object.
  const name = comment?.name ?? comment?.username ?? comment?.userName;
  if (name) {
    return {
      name: comment?.name as string | undefined,
      username: (comment?.username ?? comment?.userName) as string | undefined,
      profilePhoto: (comment?.avatar ?? comment?.profilePhoto ?? comment?.photo) as
        | string
        | undefined,
    };
  }

  if (comment) {
    console.warn(
      "getCommentAuthor: no author info found in this comment shape — check the keys below and tell me which one holds the name:",
      comment
    );
  }
  return null;
}

export function getCommentText(comment?: Comment | null): string {
  return (comment?.content ?? comment?.body ?? comment?.text ?? "") as string;
}

export function getCommentImage(comment?: Comment | null): string | null {
  return (comment?.image || comment?.photo || null) as string | null;
}

export function getCommentCreatedAt(comment?: Comment | null): string | null {
  return (comment?.createdAt || comment?.created_at || comment?.date || null) as string | null;
}

export function getIsCommentLiked(comment?: Comment | null): boolean {
  return Boolean(comment?.isLiked ?? comment?.liked ?? comment?.likedByMe ?? false);
}

export function getCommentLikesCount(comment?: Comment | null): number {
  return getCount(comment?.likesCount ?? comment?.likes);
}

export function getRepliesCount(comment?: Comment | null): number {
  return getCount(comment?.repliesCount ?? comment?.replies);
}