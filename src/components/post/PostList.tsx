import PostCard from "./PostCard";
import type { Post } from "../../types";

interface PostListProps {
  posts: Post[];
  loading: boolean;
  error: string;
  emptyMessage?: string;
  onDeleted?: (postId: string) => void;
  onUpdated?: (post: Post) => void;
  onShared?: () => void;
  onBookmarkToggled?: (postId: string, isBookmarked: boolean) => void;
}

export default function PostList({
  posts,
  loading,
  error,
  emptyMessage,
  onDeleted,
  onUpdated,
  onShared,
  onBookmarkToggled,
}: PostListProps) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
        Loading posts…
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
        {emptyMessage || "No posts yet. Be the first one to publish."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post._id || post.id}
          post={post}
          onDeleted={onDeleted}
          onUpdated={onUpdated}
          onShared={onShared}
          onBookmarkToggled={onBookmarkToggled}
        />
      ))}
    </div>
  );
}
