import { useEffect, useState } from "react";
import UserLink from "../ui/UserLink";
import Avatar from "../ui/Avatar";
import { getComments } from "../../api/commentService";
import { extractComments } from "../../utils/commentResponse";
import {
  getCommentAuthor,
  getCommentText,
} from "../../utils/commentHelpers";
import { getUserName, getUserAvatar, getProfilePath } from "../../utils/postHelpers";
import { useAuth } from "../../context/AuthContext";
import type { Comment } from "../../types";

export default function TopComment({ postId, enabled }: { postId: string; enabled: boolean }) {
  const { user: currentUser } = useAuth();
  const [comment, setComment] = useState<Comment | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getComments(postId, { page: 1, limit: 1 })
      .then(({ data }) => {
        if (cancelled) return;
        const list = extractComments(data);
        setComment(list[0] ?? null);
      })
      .catch(() => {
        // silently ignore — the card just shows no preview
      });
    return () => {
      cancelled = true;
    };
  }, [postId, enabled]);

  if (!comment) return null;

  const author = getCommentAuthor(comment);
  const profilePath = getProfilePath(author, currentUser?._id || currentUser?.id);

  return (
    <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-100">
      <UserLink to={profilePath} className="shrink-0 hover:opacity-80 transition-opacity">
        <Avatar src={getUserAvatar(author)} name={getUserName(author)} size="sm" />
      </UserLink>
      <div className="bg-gray-50 rounded-2xl px-3 py-2 min-w-0">
        <UserLink
          to={profilePath}
          className="text-xs font-semibold text-gray-900 hover:text-blue-600 hover:underline"
        >
          {getUserName(author)}
        </UserLink>
        <p className="text-sm text-gray-800 truncate">{getCommentText(comment)}</p>
      </div>
    </div>
  );
}