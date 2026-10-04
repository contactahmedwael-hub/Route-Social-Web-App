import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import PostCard from "../components/post/PostCard";
import { getSinglePost } from "../api/postService";
import { extractPost } from "../utils/postResponse";
import type { Post } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { getPostAuthor, getUserName } from "../utils/postHelpers";

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  useDocumentTitle(post ? `Post by ${getUserName(getPostAuthor(post))}` : "Post");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!postId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getSinglePost(postId)
      .then(({ data }) => {
        if (cancelled) return;
        const found = extractPost(data);
        if (found) setPost(found);
        else setError("This post couldn't be found.");
      })
      .catch(() => !cancelled && setError("Couldn't load this post."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
      >
        <FiArrowLeft /> Back
      </button>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          Loading…
        </div>
      )}

      {!loading && error && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && post && (
        <PostCard post={post} detailed onUpdated={setPost} onDeleted={() => navigate("/feed")} />
      )}

      {!loading && !error && !post && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          This post couldn't be found.{" "}
          <Link to="/feed" className="text-rp-navy font-medium hover:underline">
            Back to feed
          </Link>
        </div>
      )}
    </div>
  );
}