import { useEffect, useRef, useState } from "react";
import {
  FiCamera,
  FiMail,
  FiUsers,
  FiFileText,
  FiBookmark,
  FiUserCheck,
  FiTrash2,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/ui/Avatar";
import ExpandableImage from "../components/ui/ExpandableImage";
import PostList from "../components/post/PostList";
import { removeCoverPhoto, uploadCoverPhoto, uploadProfilePhoto } from "../api/userService";
import { getUserPosts, getBookmarks } from "../api/userService";
import { extractCoverUrl, extractPhotoUrl } from "../utils/uploadResponse";
import { extractBookmarks } from "../utils/bookmarkResponse";
import { usePosts } from "../hooks/usePosts";
import {
  getUserAvatar,
  getUserCover,
  getUserName,
  getUserHandle,
  getFollowersCount,
  getFollowingCount,
  getPostId,
} from "../utils/postHelpers";
import type { Post } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type Tab = "posts" | "saved";

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

export default function Profile() {
  const { user, updateUser, refreshProfile, bookmarksCount, setBookmarksCount } = useAuth();
  useDocumentTitle(user ? getUserName(user) : "Profile");
  const userId = (user?._id || user?.id) as string | undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [tab, setTab] = useState<Tab>("posts");

  // Cover photo: uploaded with PUT /users/upload-cover. `coverPreview` shows
  // the picked image straight away (and stays if the response doesn't say
  // where the server stored it).
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState("");
  // Set when the server can't remove a cover: the page then just stops showing it
  // (on this browser only) until a new one is uploaded.
  const [coverHidden, setCoverHidden] = useState(false);
  const coverSrc = coverPreview || (coverHidden ? null : getUserCover(user));
  const coverHiddenKey = `rp_cover_hidden_${userId}`;

  // Earlier versions kept the cover only in this browser; clear that leftover.
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(`rp_cover_photo_${userId}`);
      setCoverHidden(localStorage.getItem(`rp_cover_hidden_${userId}`) === "1");
    } catch {
      // storage unavailable — nothing to clear
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  // Removes the cover and goes back to the default blue one. If the server has
  // no way to remove it (404/405), the cover is hidden on this browser instead.
  const handleRemoveCover = async () => {
    if (!coverSrc || coverUploading) return;
    if (!window.confirm("Remove your cover photo?")) return;

    setCoverError("");
    setCoverUploading(true);
    try {
      await removeCoverPhoto();
      setCoverPreview(null);
      updateUser({ coverPhoto: null, cover: null, coverImage: null });
      await refreshProfile().catch(() => {});
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) {
        console.warn("No remove-cover request was accepted by the server; hiding the cover locally.");
        setCoverPreview(null);
        setCoverHidden(true);
        try {
          localStorage.setItem(coverHiddenKey, "1");
        } catch {
          // storage unavailable — it will show again after a refresh
        }
        setCoverError("None of the remove requests I tried worked, so the cover is only hidden on this browser.");
      } else {
        console.error("Cover removal failed:", err);
        setCoverError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            "Couldn't remove the cover photo. Please try again."
        );
      }
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCoverError("Please choose an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setCoverError("That image is too large (max 10 MB).");
      return;
    }

    setCoverError("");
    setCoverUploading(true);
    setCoverPreview(URL.createObjectURL(file));
    try {
      const { data } = await uploadCoverPhoto(file);
      const uploadedUrl = extractCoverUrl(data);

      // A new cover replaces any "hidden" state left by an earlier removal.
      setCoverHidden(false);
      try {
        localStorage.removeItem(coverHiddenKey);
      } catch {
        // storage unavailable — fine
      }

      if (uploadedUrl) {
        const bustedUrl = `${uploadedUrl}${uploadedUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        updateUser({ coverPhoto: bustedUrl, cover: bustedUrl, coverImage: bustedUrl });
        setCoverPreview(null);
      } else {
        console.error("Cover upload succeeded but no cover URL was found in:", data);
      }
      await refreshProfile().catch(() => {});
    } catch (err: any) {
      console.error("Cover upload failed:", err);
      setCoverPreview(null);
      setCoverError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Couldn't upload that cover photo. Please try again."
      );
    } finally {
      setCoverUploading(false);
    }
  };

  const myPosts = usePosts(
    () => getUserPosts(userId as string),
    [userId],
    Boolean(userId),
    userId ? `my-posts:${userId}` : undefined
  );
  const saved = usePosts(() => getBookmarks(), [], true, "saved", extractBookmarks);

  // Force a fresh fetch of the full profile whenever this page is opened,
  // rather than relying only on the one-time refresh in MainLayout — and
  // log the raw shape so followers/following/cover fields can be confirmed.
  useEffect(() => {
    refreshProfile()
      .then((profile) => {
        console.info("Profile page — fetched profile-data:", profile);
      })
      .catch(() => {
        // non-fatal — whatever's already in context still renders
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError("");
    try {
      const { data } = await uploadProfilePhoto(file);
      const uploadedUrl = extractPhotoUrl(data);

      if (uploadedUrl) {
        const bustedUrl = `${uploadedUrl}${uploadedUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
        updateUser({
          profilePhoto: bustedUrl,
          photo: bustedUrl,
          avatar: bustedUrl,
          image: bustedUrl,
        });
      } else {
        console.error("Upload succeeded but no photo URL was found in:", data);
      }

      await refreshProfile().catch(() => {});

      if (!uploadedUrl) {
        setUploadError(
          "Photo uploaded, but I couldn't confirm the new image from the response. Check the console — tell me the logged shape and I'll fix the display."
        );
      }
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      setUploadError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Couldn't upload that photo. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // This is the ground truth for how many posts are actually bookmarked —
  // sync it into the global count whenever it changes, correcting any drift
  // from optimistic adjustments made elsewhere in the app.
  useEffect(() => {
    if (!saved.loading) setBookmarksCount(saved.posts.length);
  }, [saved.posts.length, saved.loading, setBookmarksCount]);

  const activeList = tab === "posts" ? myPosts : saved;

  const handleDeleted = (id: string) => {
    myPosts.setPosts((prev: Post[]) => prev.filter((p) => getPostId(p) !== id));
    saved.setPosts((prev: Post[]) => prev.filter((p) => getPostId(p) !== id));
  };
  const handleUpdated = (updated: Post) => {
    const patch = (prev: Post[]) =>
      prev.map((p) => (getPostId(p) === getPostId(updated) ? updated : p));
    myPosts.setPosts(patch);
    saved.setPosts(patch);
  };
  const handleBookmarkToggled = (id: string, isBookmarked: boolean) => {
    if (!isBookmarked) saved.setPosts((prev: Post[]) => prev.filter((p) => getPostId(p) !== id));
  };

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 text-sm font-semibold rounded-lg px-4 py-2 transition-colors ${
      active
        ? "bg-white text-blue-600 shadow-sm"
        : "text-slate-600 hover:text-slate-900"
    }`;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Cover — falls back to a navy → sky gradient. The camera button adds or changes it. */}
        <div className="relative h-48 sm:h-60 w-full">
          {coverSrc ? (
            <ExpandableImage src={coverSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: COVER_GRADIENT }} />
          )}

          <div className="absolute top-3 right-3 flex items-center gap-2">
            {coverSrc && (
              <button
                type="button"
                onClick={handleRemoveCover}
                disabled={coverUploading}
                title="Remove cover photo"
                className="flex items-center gap-2 text-xs font-semibold text-white bg-black/45 hover:bg-black/60 disabled:opacity-70 backdrop-blur-sm rounded-full px-3 py-2"
              >
                <FiTrash2 />
                <span className="hidden sm:inline">Remove</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              title={coverSrc ? "Change cover photo" : "Add cover photo"}
              className="flex items-center gap-2 text-xs font-semibold text-white bg-black/45 hover:bg-black/60 disabled:opacity-70 backdrop-blur-sm rounded-full px-3 py-2"
            >
              <FiCamera />
              <span className="hidden sm:inline">
                {coverUploading ? "Uploading…" : coverSrc ? "Change cover" : "Add cover"}
              </span>
            </button>
          </div>
        </div>

        {/* Info panel — overlaps the bottom of the cover, inset from the edges */}
        <div className="relative -mt-16 mx-3 sm:mx-8 rounded-t-3xl bg-white px-4 sm:px-7 pt-7 pb-8 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <Avatar
                  src={getUserAvatar(user)}
                  name={getUserName(user)}
                  size="xl"
                  expandable
                  className="ring-4 ring-white shadow-lg"
                />
                <button
                  type="button"
                  onClick={handlePickPhoto}
                  disabled={uploading}
                  title="Change profile photo"
                  className="absolute bottom-0 right-0 bg-rp-navy text-white rounded-full p-2 border-2 border-white shadow hover:bg-rp-navy-dark disabled:opacity-60"
                >
                  <FiCamera className="text-xs" />
                </button>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 truncate">
                  {getUserName(user)}
                </h1>
                <p className="text-base sm:text-lg text-slate-500">{getUserHandle(user)}</p>
                <span className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
                  <FiUserCheck /> Route Posts member
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <StatBox label="Followers" value={getFollowersCount(user)} />
              <StatBox label="Following" value={getFollowingCount(user)} />
              <StatBox label="Bookmarks" value={bookmarksCount} />
            </div>
          </div>

          {uploading && <p className="text-xs text-slate-400 mt-3">Uploading…</p>}
          {uploadError && <p className="text-xs text-red-500 mt-3">{uploadError}</p>}
          {coverError && <p className="text-xs text-red-500 mt-3">{coverError}</p>}

          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverChange}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />

          <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4 mt-6">
            <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-3">About</h2>
              <div className="space-y-2.5 text-sm text-slate-600">
                {user?.email && (
                  <p className="flex items-center gap-2.5">
                    <FiMail className="text-slate-400" /> {user.email as string}
                  </p>
                )}
                <p className="flex items-center gap-2.5">
                  <FiUsers className="text-slate-400" /> Active on Route Posts
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-2 gap-4">
              <div className="border border-slate-200 bg-blue-50/40 rounded-2xl px-4 py-3">
                <p className="text-xs font-bold text-slate-600 uppercase">My Posts</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{myPosts.posts.length}</p>
              </div>
              <div className="border border-slate-200 bg-blue-50/40 rounded-2xl px-4 py-3">
                <p className="text-xs font-bold text-slate-600 uppercase">Saved Posts</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{bookmarksCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs — segmented control on the left, count badge on the right */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 flex items-center justify-between">
        <div className="inline-flex gap-1 bg-slate-100 rounded-xl p-1">
          <button onClick={() => setTab("posts")} className={tabClass(tab === "posts")}>
            <FiFileText /> My Posts
          </button>
          <button onClick={() => setTab("saved")} className={tabClass(tab === "saved")}>
            <FiBookmark /> Saved
          </button>
        </div>
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-3 py-1">
          {activeList.posts.length}
        </span>
      </div>

      <PostList
        posts={activeList.posts}
        loading={activeList.loading}
        error={activeList.error}
        emptyMessage={
          tab === "posts" ? "You haven't posted anything yet." : "You haven't saved anything yet."
        }
        onDeleted={handleDeleted}
        onUpdated={handleUpdated}
        onBookmarkToggled={handleBookmarkToggled}
        onShared={tab === "posts" ? myPosts.refetch : saved.refetch}
      />
    </div>
  );
}