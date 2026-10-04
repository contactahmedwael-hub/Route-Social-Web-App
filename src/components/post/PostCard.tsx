import { useEffect, useState } from "react";
import {
  FiMoreHorizontal,
  FiThumbsUp,
  FiMessageCircle,
  FiShare2,
  FiExternalLink,
  FiBookmark,
  FiEdit2,
  FiTrash2,
  FiX,
  FiRepeat,
  FiClock,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../ui/Avatar";
import UserLink from "../ui/UserLink";
import ExpandableImage from "../ui/ExpandableImage";
import CommentSection from "../comment/CommentSection";
import TopComment from "../comment/TopComment";
import {
  getPostAuthor,
  getPostId,
  getPostText,
  getPostImage,
  getPostCreatedAt,
  getSharedPost,
  getSharedPostRefId,
  getIsLiked,
  getIsBookmarked,
  getCount,
  formatRelativeTime,
  getUserName,
  getUserHandle,
  getUserAvatar,
  getProfilePath,
} from "../../utils/postHelpers";
import { extractPost } from "../../utils/postResponse";
import {
  getSinglePost,
  getPostLikes,
  toggleLike,
  toggleBookmark,
  sharePost,
  updatePost,
  deletePost,
} from "../../api/postService";
import { useAuth } from "../../context/AuthContext";
import type { Post, User } from "../../types";

function PostHeader({ post, compact = false }: { post: Post; compact?: boolean }) {
  const { user: currentUser } = useAuth();
  const author = getPostAuthor(post);
  const profilePath = getProfilePath(author, currentUser?._id || currentUser?.id);
  return (
    <Link to={profilePath} className="flex items-center gap-3 group">
      <Avatar src={getUserAvatar(author)} name={getUserName(author)} size={compact ? "sm" : "md"} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate group-hover:underline">
          {getUserName(author)}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {getUserHandle(author)}
          {compact && getUserHandle(author) && " · "}
          {compact && formatRelativeTime(getPostCreatedAt(post))}
        </p>
      </div>
    </Link>
  );
}

// "Oct 3, 9:45 AM" (the year is added only for posts from another year).
function formatPostDate(dateInput?: string | null): string {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  });
}

// Shows the whole image whatever its size or shape: it scales to the card's
// width, is capped in height, and anything that doesn't fill the box (tall,
// narrow or small images) sits centred on the dark backdrop instead of being
// cropped.
function ImageStage({
  src,
  className = "",
  maxHeightClass = "max-h-[560px]",
}: {
  src: string;
  className?: string;
  maxHeightClass?: string;
}) {
  return (
    <div className={`bg-[#0e1220] flex items-center justify-center ${className}`}>
      <ExpandableImage
        src={src}
        alt=""
        className={`block w-full ${maxHeightClass} object-contain`}
      />
    </div>
  );
}

// Resolves the shared/original post for a repost — either it's already
// embedded on the post object, or only an id was given and it needs its
// own fetch via Get Single Post.
function useResolvedSharedPost(post: Post): Post | null {
  const embedded = getSharedPost(post);
  const refId = !embedded ? getSharedPostRefId(post) : null;
  const [fetched, setFetched] = useState<Post | null>(null);

  useEffect(() => {
    if (!refId) return;
    let cancelled = false;
    getSinglePost(refId)
      .then(({ data }) => {
        if (!cancelled) setFetched(extractPost(data));
      })
      .catch(() => {
        // silently ignore — the card just won't show the original preview
      });
    return () => {
      cancelled = true;
    };
  }, [refId]);

  return embedded || fetched;
}

interface PostCardProps {
  post: Post;
  detailed?: boolean;
  onDeleted?: (postId: string) => void;
  onUpdated?: (post: Post) => void;
  onShared?: () => void;
  onBookmarkToggled?: (postId: string, isBookmarked: boolean) => void;
}

export default function PostCard({
  post,
  detailed = false,
  onDeleted,
  onUpdated,
  onShared,
  onBookmarkToggled,
}: PostCardProps) {
  const navigate = useNavigate();
  const { user: currentUser, adjustBookmarksCount } = useAuth();
  const postId = getPostId(post);
  const author = getPostAuthor(post);
  const isOwner =
    Boolean(currentUser) &&
    (currentUser?._id || currentUser?.id) &&
    (currentUser?._id || currentUser?.id) === (author?._id || author?.id);

  const shared = useResolvedSharedPost(post);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(getIsLiked(post));
  const [likes, setLikes] = useState(getCount(post?.likesCount ?? post?.likes));
  const [isBookmarked, setIsBookmarked] = useState(getIsBookmarked(post));
  const [commentsCount, setCommentsCount] = useState(
    getCount(post?.commentsCount ?? post?.comments)
  );
  const [shares, setShares] = useState(getCount(post?.sharesCount ?? post?.shares));

  const [showLikers, setShowLikers] = useState(false);
  const [likers, setLikers] = useState<User[]>([]);
  const [likersLoaded, setLikersLoaded] = useState(false);
  const [likersLoading, setLikersLoading] = useState(false);
  const [likersError, setLikersError] = useState("");

  const [showShareBox, setShowShareBox] = useState(false);
  const [shareText, setShareText] = useState("");
  const [sharing, setSharing] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(getPostText(post));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikes((n) => n + (nextLiked ? 1 : -1));
    setLikersLoaded(false);
    try {
      await toggleLike(postId);
    } catch {
      // revert on failure
      setIsLiked(!nextLiked);
      setLikes((n) => n - (nextLiked ? 1 : -1));
    }
  };

  const handleToggleBookmark = async () => {
    const next = !isBookmarked;
    setIsBookmarked(next);
    adjustBookmarksCount(next ? 1 : -1);
    try {
      await toggleBookmark(postId);
      onBookmarkToggled?.(postId, next);
    } catch {
      setIsBookmarked(!next);
      adjustBookmarksCount(next ? -1 : 1);
    }
  };

  const handleToggleLikers = async () => {
    const next = !showLikers;
    setShowLikers(next);
    if (next && !likersLoaded) {
      setLikersLoading(true);
      setLikersError("");
      try {
        const { data } = await getPostLikes(postId, { page: 1, limit: 20 });
        const candidates = [
          data?.likes,
          data?.users,
          data?.data?.likes,
          data?.data?.users,
          data?.data,
          data?.results,
          data,
        ];
        const list = candidates.find((c) => Array.isArray(c)) ?? [];
        // A like entry might be the user itself, or a wrapper like
        // { user: {...}, likedAt } — unwrap the latter so Avatar/name
        // getters (which expect a user object) work either way.
        const unwrapped = list.map((entry: any) => entry?.user ?? entry);
        setLikers(unwrapped);
        setLikersLoaded(true);

        if (unwrapped.length === 0 && likes > 0) {
          console.warn(
            "Get Post Likes returned no usable array even though the post shows likes — check this response shape:",
            data
          );
        }
      } catch (err) {
        console.error("Get Post Likes failed:", err);
        setLikersError("Couldn't load likes.");
      } finally {
        setLikersLoading(false);
      }
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await sharePost(postId, shareText.trim());
      setShares((n) => n + 1);
      setShareText("");
      setShowShareBox(false);
      onShared?.();
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setSharing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("body", editText.trim());
      const { data } = await updatePost(postId, formData);
      const updated = extractPost(data) || { ...post, body: editText.trim() };
      onUpdated?.(updated);
      setEditing(false);
    } catch (err) {
      console.error("Update post failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    try {
      await deletePost(postId);
      onDeleted?.(postId);
    } catch (err) {
      console.error("Delete post failed:", err);
      setDeleting(false);
    }
  };

  const text = getPostText(post);
  const image = getPostImage(post);

  return (
    <article className="bg-white border border-gray-100 shadow-sm rounded-2xl py-4">
      <div className="px-4 flex items-start justify-between gap-3">
        <PostHeader post={post} />
        <div className="flex items-center gap-3 shrink-0">
          {!detailed && (
            <Link
              to={`/posts/${postId}`}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View details
            </Link>
          )}
          <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <FiMoreHorizontal />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              <button
                onClick={handleToggleBookmark}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <FiBookmark className={isBookmarked ? "fill-current text-rp-navy" : ""} />
                {isBookmarked ? "Unsave" : "Save post"}
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FiEdit2 /> Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <FiTrash2 /> {deleting ? "Deleting…" : "Delete"}
                  </button>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {editing ? (
        <div className="mt-3 px-4">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            className="w-full resize-none bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setEditing(false);
                setEditText(text);
              }}
              className="text-sm text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="text-sm text-white bg-rp-navy disabled:bg-rp-navy/50 px-3 py-1.5 rounded-lg"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        text && <p className="text-sm text-gray-800 mt-3 px-4 whitespace-pre-wrap">{text}</p>
      )}

      {!editing && image && <ImageStage src={image} className="mt-3" />}

      {shared && (
        <div className="mt-3 mx-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div className="flex items-start justify-between">
            <PostHeader post={shared} compact />
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs text-rp-navy font-medium flex items-center gap-1 shrink-0"
            >
              Original Post <FiExternalLink />
            </a>
          </div>
          {getPostText(shared) && (
            <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">
              {getPostText(shared)}
            </p>
          )}
          {getPostImage(shared) && (
            <ImageStage
              src={getPostImage(shared) as string}
              className="mt-2 rounded-lg overflow-hidden"
              maxHeightClass="max-h-[400px]"
            />
          )}
        </div>
      )}

      <div
        className={`mt-3 flex items-center justify-between gap-3 text-sm text-gray-500 ${
          image && !editing ? "px-4 pt-1" : "mx-4 pt-3 border-t border-gray-100"
        }`}
      >
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={handleToggleLikers}
            disabled={likes === 0}
            className="flex items-center gap-1.5 hover:underline disabled:no-underline disabled:cursor-default"
          >
            <FiThumbsUp className="text-blue-600" /> {likes} likes
          </button>
          <span className="flex items-center gap-1.5">
            <FiRepeat className="text-blue-600" /> {shares} shares
          </span>
          <span className="flex items-center gap-1.5">
            <FiMessageCircle className="text-blue-600" /> {commentsCount} comments
          </span>
        </div>
        {formatPostDate(getPostCreatedAt(post)) && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 shrink-0">
            <FiClock /> {formatPostDate(getPostCreatedAt(post))}
          </span>
        )}
      </div>

      {showLikers && (
        <div className="mx-4 mt-2 pt-2 border-t border-gray-100">
          {likersLoading && <p className="text-xs text-gray-400 py-1">Loading likes…</p>}
          {likersError && <p className="text-xs text-red-500 py-1">{likersError}</p>}
          {!likersLoading && !likersError && likers.length === 0 && (
            <p className="text-xs text-gray-400 py-1">
              {likes > 0
                ? "Couldn't match the likers list for this post — check the console for the raw response."
                : "No likes yet."}
            </p>
          )}
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {likers.map((liker, i) => (
              <li key={(liker._id || liker.id || i) as string}>
                <UserLink
                  to={getProfilePath(liker, currentUser?._id || currentUser?.id)}
                  className="flex items-center gap-2 rounded-lg px-1 py-0.5 -mx-1 hover:bg-gray-50"
                >
                  <Avatar src={getUserAvatar(liker)} name={getUserName(liker)} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 truncate">{getUserName(liker)}</p>
                    {getUserHandle(liker) && (
                      <p className="text-xs text-gray-400 truncate">{getUserHandle(liker)}</p>
                    )}
                  </div>
                </UserLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-4 flex items-center justify-around mt-3 pt-2 border-t border-gray-100">
        <button
          onClick={handleToggleLike}
          className={`flex items-center gap-2 text-sm rounded-lg px-3 py-1.5 hover:bg-gray-50 ${
            isLiked ? "text-rp-navy font-semibold" : "text-gray-600"
          }`}
        >
          <FiThumbsUp className={isLiked ? "fill-current" : ""} /> Like
        </button>
        <button
          onClick={() => {
            if (detailed) {
              document
                .getElementById(`comment-composer-${postId}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
              navigate(`/posts/${postId}`);
            }
          }}
          className="flex items-center gap-2 text-sm text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50"
        >
          <FiMessageCircle /> Comment
        </button>
        <button
          onClick={() => setShowShareBox((v) => !v)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-1.5"
        >
          <FiShare2 /> Share
        </button>
      </div>

      {showShareBox && (
        <div className="mx-4 mt-2 pt-2 border-t border-gray-100 flex items-start gap-2">
          <input
            type="text"
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
            placeholder="Say something about this (optional)"
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy"
          />
          <button
            onClick={handleShare}
            disabled={sharing}
            className="text-sm text-white bg-rp-navy disabled:bg-rp-navy/50 rounded-lg px-3 py-2"
          >
            {sharing ? "Sharing…" : "Share"}
          </button>
          <button
            onClick={() => setShowShareBox(false)}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            <FiX />
          </button>
        </div>
      )}

      {detailed ? (
        <div id={`comment-composer-${postId}`} className="px-4">
          <CommentSection
            postId={postId}
            pageSize={5}
            onCountChange={(delta) => setCommentsCount((n) => n + delta)}
          />
        </div>
      ) : (
        <div className="px-4">
          <TopComment postId={postId} enabled={commentsCount > 0} />
        </div>
      )}
    </article>
  );
}