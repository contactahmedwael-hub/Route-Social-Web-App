import PostComposer from "../components/post/PostComposer";
import PostList from "../components/post/PostList";
import { usePosts } from "../hooks/usePosts";
import { getHomeFeed } from "../api/postService";
import { getPostId } from "../utils/postHelpers";
import type { Post } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function Feed() {
  useDocumentTitle("Feed");
  const { posts, setPosts, loading, error, refetch } = usePosts(
    () => getHomeFeed({ only: "following", limit: 10 }),
    [],
    true,
    "feed"
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