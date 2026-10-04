import { useEffect } from "react";
import PostComposer from "../components/post/PostComposer";
import PostList from "../components/post/PostList";
import { usePosts } from "../hooks/usePosts";
import { getBookmarks } from "../api/userService";
import { extractBookmarks } from "../utils/bookmarkResponse";
import { getPostId } from "../utils/postHelpers";
import { useAuth } from "../context/AuthContext";
import type { Post } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function Saved() {
  useDocumentTitle("Saved");
  const { posts, setPosts, loading, error, refetch } = usePosts(
    () => getBookmarks(),
    [],
    true,
    "saved",
    extractBookmarks
  );
  const { setBookmarksCount } = useAuth();

  // This is the ground truth for how many posts are actually bookmarked —
  // sync it into the global count whenever it changes, correcting any drift
  // from optimistic adjustments made elsewhere in the app.
  useEffect(() => {
    if (!loading) setBookmarksCount(posts.length);
  }, [posts.length, loading, setBookmarksCount]);

  return (
    <div className="space-y-4">
      <PostComposer onPostCreated={(post: Post) => setPosts((prev) => [post, ...prev])} />
      <PostList
        posts={posts}
        loading={loading}
        error={error}
        // Unbookmarking here should drop the post from this list right away.
        onDeleted={(id) => setPosts((prev) => prev.filter((p) => getPostId(p) !== id))}
        onUpdated={(updated) =>
          setPosts((prev) =>
            prev.map((p) => (getPostId(p) === getPostId(updated) ? updated : p))
          )
        }
        onBookmarkToggled={(id, isBookmarked) => {
          if (!isBookmarked) setPosts((prev) => prev.filter((p) => getPostId(p) !== id));
        }}
        onShared={refetch}
      />
    </div>
  );
}