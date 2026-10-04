import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { FiArrowLeft, FiUserPlus, FiUserCheck, FiFileText } from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import ExpandableImage from "../components/ui/ExpandableImage";
import PostList from "../components/post/PostList";
import { getUserProfile, getUserPosts, toggleFollow } from "../api/userService";
import { usePosts } from "../hooks/usePosts";
import { useAuth } from "../context/AuthContext";
import {
  getUserName,
  getUserHandle,
  getUserAvatar,
  getUserCover,
  getFollowersCount,
  getFollowingCount,
  getIsFollowing,
  getPostId,
} from "../utils/postHelpers";
import { extractProfile } from "../utils/profileResponse";
import type { User } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

// Fallback cover: deep navy on the left fading to a soft sky blue on the right
const COVER_GRADIENT =
  "radial-gradient(circle at 88% 70%, rgba(130,175,220,0.75), transparent 45%)," +
  "radial-gradient(circle at 30% 20%, rgba(70,95,130,0.55), transparent 40%)," +
  "linear-gradient(115deg, #1a2740 0%, #24456f 45%, #5a89b6 100%)";

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex-1 sm:flex-none text-center bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-4 sm:min-w-[152px]">
      <p className="text-[11px] font-bold tracking-wide text-slate-600 uppercase">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 mt-1 leading-none">{value}</p>
    </div>
  );
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const currentUserId = (currentUser?._id || currentUser?.id) as string | undefined;

  const [profile, setProfile] = useState<User | null>(null);
  useDocumentTitle(profile ? getUserName(profile) : "Profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followPending, setFollowPending] = useState(false);

  const { posts, setPosts, loading: postsLoading, error: postsError } = usePosts(
    () => getUserPosts(userId as string),
    [userId],
    Boolean(userId)
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getUserProfile(userId)
      .then(({ data }) => {
        if (cancelled) return;
        console.info("UserProfile page — raw response:", data);
        const person: User | null = extractProfile(data);
        setProfile(person);
        setIsFollowing(getIsFollowing(person));
      })
      .catch(() => !cancelled && setError("Couldn't load this profile."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Visiting your own id here should land on the full "My Profile" page.
  if (userId && currentUserId && userId === currentUserId) {
    return <Navigate to="/profile" replace />;
  }

  const handleToggleFollow = async () => {
    if (!userId || followPending) return;
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowPending(true);
    try {
      await toggleFollow(userId);
    } catch {
      setIsFollowing(!next);
    } finally {
      setFollowPending(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Loading…</div>;
  }

  if (error || !profile) {
    return (
      <div className="py-2">
        <p className="text-sm text-red-500">{error || "This profile couldn't be found."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm px-3.5 py-2 hover:bg-slate-50"
      >
        <FiArrowLeft /> Back
      </button>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Cover — falls back to a navy → sky gradient */}
        <div className="h-48 sm:h-60 w-full">
          {getUserCover(profile) ? (
            <ExpandableImage
              src={getUserCover(profile) as string}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full" style={{ background: COVER_GRADIENT }} />
          )}
        </div>

        {/* Info panel — overlaps the bottom of the cover, inset from the edges */}
        <div className="relative -mt-16 mx-3 sm:mx-8 rounded-t-3xl bg-white px-4 sm:px-7 pt-7 pb-8 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-5">
              <Avatar
                src={getUserAvatar(profile)}
                name={getUserName(profile)}
                size="xl"
                expandable
                className="ring-4 ring-white shadow-lg shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 truncate">
                  {getUserName(profile)}
                </h1>
                <p className="text-base sm:text-lg text-slate-500">{getUserHandle(profile)}</p>
                <button
                  onClick={handleToggleFollow}
                  disabled={followPending}
                  className={`mt-2.5 inline-flex items-center gap-2 text-sm font-semibold rounded-full px-4 py-1.5 border disabled:opacity-60 transition-colors ${
                    isFollowing
                      ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                      : "bg-rp-navy text-white border-rp-navy hover:bg-rp-navy-dark"
                  }`}
                >
                  {isFollowing ? <FiUserCheck /> : <FiUserPlus />}
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <StatBox label="Followers" value={getFollowersCount(profile)} />
              <StatBox label="Following" value={getFollowingCount(profile)} />
              <StatBox label="Posts" value={posts.length} />
            </div>
          </div>
        </div>
      </div>

      {/* Header bar — matches the tabs bar on your own profile */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 flex items-center justify-between">
        <div className="inline-flex bg-slate-100 rounded-xl p-1">
          <span className="flex items-center gap-2 text-sm font-semibold rounded-lg px-4 py-2 bg-white text-blue-600 shadow-sm">
            <FiFileText /> Posts
          </span>
        </div>
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1">
          {posts.length}
        </span>
      </div>

      <PostList
        posts={posts}
        loading={postsLoading}
        error={postsError}
        emptyMessage={`${getUserName(profile)} hasn't posted anything yet.`}
        onDeleted={(id) => setPosts((prev) => prev.filter((p) => getPostId(p) !== id))}
        onUpdated={(updated) =>
          setPosts((prev) =>
            prev.map((p) => (getPostId(p) === getPostId(updated) ? updated : p))
          )
        }
      />
    </div>
  );
}