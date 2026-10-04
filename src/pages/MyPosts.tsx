import PostComposer from "../components/post/PostComposer";
import PostList from "../components/post/PostList";
import { usePosts } from "../hooks/usePosts";
import { getUserPosts } from "../api/userService";
import { useAuth } from "../context/AuthContext";
import { getPostId } from "../utils/postHelpers";
import type { Post } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function MyPosts() {
  useDocumentTitle("My Posts");
  const { user } = useAuth();
  const userId = (user?._id || user?.id) as string | undefined;

  const { posts, setPosts, loading, error, refetch } = usePosts(
    () => getUserPosts(userId as string),
    [userId],
    Boolean(userId),
    userId ? `my-posts:${userId}` : undefined
  );

  return (
    <div className="space-y-4">
      <PostComposer onPostCreated={(post: Post) => setPosts((prev) => [post, ...prev])} />
      <PostList
        posts={posts}
        loading={loading}
        error={error}
        onDeleted={(id) => setPosts((prev) => prev.filter((p) => getPostId(p) !== id))}
        onUpdated={(updated) =>
          setPosts((prev) =>
            prev.map((p) => (getPostId(p) === getPostId(updated) ? updated : p))
          )
        }
        onShared={refetch}
      />
    </div>
  );
}