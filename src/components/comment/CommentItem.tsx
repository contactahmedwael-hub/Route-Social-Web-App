import { useState } from "react";
import { FiThumbsUp, FiEdit2, FiTrash2, FiCornerUpLeft } from "react-icons/fi";
import Avatar from "../ui/Avatar";
import ExpandableImage from "../ui/ExpandableImage";
import CommentComposer from "./CommentComposer";
import {
  getCommentId,
  getCommentAuthor,
  getCommentText,
  getCommentImage,
  getCommentCreatedAt,
  getIsCommentLiked,
  getCommentLikesCount,
  getRepliesCount,
} from "../../utils/commentHelpers";
import { extractComments, extractComment } from "../../utils/commentResponse";
import {
  getReplies,
  createReply,
  updateComment,
  deleteComment,
  toggleCommentLike,
} from "../../api/commentService";
import UserLink from "../ui/UserLink";
import {
  getUserName,
  getUserAvatar,
  formatRelativeTime,
  getProfilePath,
} from "../../utils/postHelpers";
import { useAuth } from "../../context/AuthContext";
import type { Comment } from "../../types";

interface CommentItemProps {
  postId: string;
  comment: Comment;
  isReply?: boolean;
  onDeleted?: (commentId: string) => void;
  onUpdated?: (comment: Comment) => void;
}

export default function CommentItem({
  postId,
  comment,
  isReply = false,
  onDeleted,
  onUpdated,
}: CommentItemProps) {
  const { user: currentUser } = useAuth();
  const commentId = getCommentId(comment);
  const author = getCommentAuthor(comment);
  const isOwner =
    Boolean(currentUser) &&
    (currentUser?._id || currentUser?.id) &&
    (currentUser?._id || currentUser?.id) === (author?._id || author?.id);

  const [isLiked, setIsLiked] = useState(getIsCommentLiked(comment));
  const [likes, setLikes] = useState(getCommentLikesCount(comment));
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(getCommentText(comment));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showReplyBox, setShowReplyBox] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [repliesError, setRepliesError] = useState("");
  const [repliesCount, setRepliesCount] = useState(getRepliesCount(comment));

  const handleToggleLike = async () => {
    const next = !isLiked;
    setIsLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    try {
      await toggleCommentLike(postId, commentId);
    } catch {
      setIsLiked(!next);
      setLikes((n) => n - (next ? 1 : -1));
    }
  };

  const handleSaveEdit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("content", editText.trim());
      const { data } = await updateComment(postId, commentId, formData);
      const updated = extractComment(data) || { ...comment, content: editText.trim() };
      onUpdated?.(updated);
      setEditing(false);
    } catch (err) {
      console.error("Update comment failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm("Delete this comment?")) return;
    setDeleting(true);
    try {
      await deleteComment(postId, commentId);
      onDeleted?.(commentId);
    } catch (err) {
      console.error("Delete comment failed:", err);
      setDeleting(false);
    }
  };

  const handleToggleReplies = async () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next && !repliesLoaded) {
      setRepliesLoading(true);
      setRepliesError("");
      try {
        const { data } = await getReplies(postId, commentId, { page: 1, limit: 10 });
        setReplies(extractComments(data));
        setRepliesLoaded(true);
      } catch {
        setRepliesError("Couldn't load replies.");
      } finally {
        setRepliesLoading(false);
      }
    }
  };

  const handleCreateReply = async (content: string, image: File | null) => {
    const formData = new FormData();
    formData.append("content", content);
    if (image) formData.append("image", image);
    const { data } = await createReply(postId, commentId, formData);
    const newReply = extractComment(data);
    if (newReply) {
      setReplies((prev) => [...prev, newReply]);
      setRepliesCount((n) => n + 1);
      setRepliesLoaded(true);
      setShowReplies(true);
    }
    setShowReplyBox(false);
  };

  const text = getCommentText(comment);
  const image = getCommentImage(comment);
  const profilePath = getProfilePath(author, currentUser?._id || currentUser?.id);

  return (
    <div className="flex items-start gap-2">
      <UserLink to={profilePath} className="shrink-0 hover:opacity-80 transition-opacity">
        <Avatar src={getUserAvatar(author)} name={getUserName(author)} size="sm" />
      </UserLink>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-2xl px-3 py-2 inline-block max-w-full">
          <UserLink
            to={profilePath}
            className="text-xs font-semibold text-gray-900 hover:text-blue-600 hover:underline"
          >
            {getUserName(author)}
          </UserLink>
          {editing ? (
            <div className="mt-1">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-rp-navy/20"
              />
              <div className="flex justify-end gap-2 mt-1">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditText(text);
                  }}
                  className="text-xs text-gray-500 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="text-xs text-white bg-rp-navy disabled:bg-rp-navy/50 rounded-lg px-2 py-1"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            text && <p className="text-sm text-gray-800 whitespace-pre-wrap">{text}</p>
          )}
        </div>

        {!editing && image && (
          <ExpandableImage
            src={image}
            alt=""
            className="mt-1 max-h-48 rounded-lg border border-gray-100 object-cover"
          />
        )}

        <div className="flex items-center gap-3 mt-1 pl-3 text-xs text-gray-500">
          <span>{formatRelativeTime(getCommentCreatedAt(comment))}</span>
          <button
            onClick={handleToggleLike}
            className={`font-semibold flex items-center gap-1 ${
              isLiked ? "text-rp-navy" : "hover:text-gray-700"
            }`}
          >
            <FiThumbsUp className={isLiked ? "fill-current" : ""} />
            {likes > 0 ? likes : "Like"}
          </button>
          {!isReply && (
            <button
              onClick={() => setShowReplyBox((v) => !v)}
              className="font-semibold flex items-center gap-1 hover:text-gray-700"
            >
              <FiCornerUpLeft /> Reply
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="hover:text-gray-700"
                title="Edit"
              >
                <FiEdit2 />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="hover:text-red-600"
                title="Delete"
              >
                <FiTrash2 />
              </button>
            </>
          )}
        </div>

        {!isReply && showReplyBox && (
          <div className="mt-2 pl-3">
            <CommentComposer
              placeholder="Write a reply…"
              onSubmit={handleCreateReply}
              autoFocus
            />
          </div>
        )}

        {!isReply && repliesCount > 0 && (
          <button
            onClick={handleToggleReplies}
            className="mt-1 ml-3 text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            {showReplies ? "Hide replies" : `View ${repliesCount} ${repliesCount === 1 ? "reply" : "replies"}`}
          </button>
        )}

        {!isReply && showReplies && (
          <div className="mt-2 pl-3 space-y-3 border-l-2 border-gray-100">
            {repliesLoading && <p className="text-xs text-gray-400">Loading replies…</p>}
            {repliesError && <p className="text-xs text-red-500">{repliesError}</p>}
            {replies.map((reply) => (
              <CommentItem
                key={getCommentId(reply)}
                postId={postId}
                comment={reply}
                isReply
                onDeleted={(id) => setReplies((prev) => prev.filter((r) => getCommentId(r) !== id))}
                onUpdated={(updated) =>
                  setReplies((prev) =>
                    prev.map((r) => (getCommentId(r) === getCommentId(updated) ? updated : r))
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 