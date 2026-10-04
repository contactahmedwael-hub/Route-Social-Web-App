import { useEffect, useState } from "react";
import CommentComposer from "./CommentComposer";
import CommentItem from "./CommentItem";
import { getComments, createComment } from "../../api/commentService";
import {
  extractComments,
  extractComment,
  extractCommentsHasMore,
} from "../../utils/commentResponse";
import { getCommentId } from "../../utils/commentHelpers";
import type { Comment } from "../../types";

// Whether another page of comments exists after the one just loaded. Uses the
// API's paging info; if a response has none, it looks at the next page so
// "Load more comments" is only shown when that page really has comments.
async function hasCommentsAfter(
  postId: string,
  pageSize: number,
  page: number,
  data: any,
  list: Comment[]
): Promise<boolean> {
  const fromApi = extractCommentsHasMore(data);
  if (fromApi !== null) return fromApi;
  if (list.length < pageSize) return false;
  try {
    const { data: next } = await getComments(postId, { page: page + 1, limit: pageSize });
    return extractComments(next).length > 0;
  } catch {
    return false;
  }
}

interface CommentSectionProps {
  postId: string;
  onCountChange?: (delta: number) => void;
  pageSize?: number;
}

export default function CommentSection({
  postId,
  onCountChange,
  pageSize = 10,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getComments(postId, { page: 1, limit: pageSize })
      .then(async ({ data }) => {
        if (cancelled) return;
        const list = extractComments(data);
        setComments(list);
        setPage(1);
        const more = await hasCommentsAfter(postId, pageSize, 1, data, list);
        if (!cancelled) setHasMore(more);
      })
      .catch(() => !cancelled && setError("Couldn't load comments."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [postId, pageSize]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await getComments(postId, { page: nextPage, limit: pageSize });
      const list = extractComments(data);
      setComments((prev) => [...prev, ...list]);
      setPage(nextPage);
      setHasMore(await hasCommentsAfter(postId, pageSize, nextPage, data, list));
    } catch {
      // leave the existing list as-is
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreateComment = async (content: string, image: File | null) => {
    const formData = new FormData();
    formData.append("content", content);
    if (image) formData.append("image", image);
    const { data } = await createComment(postId, formData);
    const newComment = extractComment(data);
    if (newComment) {
      setComments((prev) => [newComment, ...prev]);
      onCountChange?.(1);
    }
  };

  return (
    <div className="mt-2 pt-3 border-t border-gray-100 space-y-3">
      <CommentComposer onSubmit={handleCreateComment} />

      {loading && <p className="text-xs text-gray-400">Loading comments…</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {!loading && !error && comments.length === 0 && (
        <p className="text-xs text-gray-400">No comments yet. Be the first to reply.</p>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={getCommentId(comment)}
            postId={postId}
            comment={comment}
            onDeleted={(id) => {
              setComments((prev) => prev.filter((c) => getCommentId(c) !== id));
              onCountChange?.(-1);
            }}
            onUpdated={(updated) =>
              setComments((prev) =>
                prev.map((c) => (getCommentId(c) === getCommentId(updated) ? updated : c))
              )
            }
          />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="text-xs font-semibold text-rp-navy hover:underline"
        >
          {loadingMore ? "Loading…" : "Load more comments"}
        </button>
      )}
    </div>
  );
}