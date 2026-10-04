import { useState } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiUserPlus, FiUserCheck } from "react-icons/fi";
import Avatar from "../ui/Avatar";
import {
  useFollowSuggestions,
  useUserSearch,
  getSuggestionId,
} from "../../hooks/useFollowSuggestions";
import { useAuth } from "../../context/AuthContext";
import {
  getUserName,
  getUserHandle,
  getUserAvatar,
  getCount,
  getProfilePath,
} from "../../utils/postHelpers";

const SIDEBAR_FETCH_LIMIT = 20;
const SIDEBAR_DISPLAY_COUNT = 5;

export default function SuggestedFriends() {
  const { user: currentUser } = useAuth();
  const currentUserId = (currentUser?._id || currentUser?.id) as string | undefined;
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  // The default list and the search are separate on purpose: searching walks
  // through every user, and its loading/error state never leaks into the
  // suggestions list (or the other way round) when the box is cleared.
  const suggestions = useFollowSuggestions(SIDEBAR_FETCH_LIMIT);
  const search = useUserSearch(query);
  const { loading, error, followingIds, pendingIds, toggleFollowFor } = isSearching
    ? search
    : suggestions;

  // The sidebar stays compact: only the first few people, searching or not.
  // "View more" opens the full Suggested Friends page for the rest.
  const topPeople = (isSearching ? search.results : suggestions.people).slice(
    0,
    SIDEBAR_DISPLAY_COUNT
  );

  const viewMorePath = isSearching
    ? `/suggested-friends?search=${encodeURIComponent(query.trim())}`
    : "/suggested-friends";

  return (
    <aside className="w-full lg:w-80 lg:shrink-0">
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            Suggested Friends
          </h2>
          {topPeople.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              {topPeople.length}
            </span>
          )}
        </div>

        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy"
          />
        </div>

        {loading && topPeople.length === 0 && (
          <p className="text-sm text-gray-400 py-2">
            {isSearching ? "Searching…" : "Loading…"}
          </p>
        )}
        {!loading && error && <p className="text-sm text-red-500 py-2">{error}</p>}
        {!loading && !error && topPeople.length === 0 && (
          <p className="text-sm text-gray-400 py-2">
            {isSearching ? "No users found." : "No suggestions right now."}
          </p>
        )}

        <ul className="space-y-4">
          {topPeople.map((person) => {
            const id = getSuggestionId(person);
            const isFollowing = followingIds.has(id);
            const isPending = pendingIds.has(id);
            return (
              <li key={id} className="flex items-start gap-3">
                <Link to={getProfilePath(person, currentUserId)} className="shrink-0">
                  <Avatar src={getUserAvatar(person)} name={getUserName(person)} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={getProfilePath(person, currentUserId)} className="min-w-0 group">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:underline">
                        {getUserName(person)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {getUserHandle(person)}
                      </p>
                    </Link>
                    <button
                      onClick={() => toggleFollowFor(id)}
                      disabled={isPending}
                      className={`shrink-0 flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1.5 transition-colors disabled:opacity-60 ${
                        isFollowing
                          ? "bg-gray-100 text-gray-700"
                          : "bg-rp-navy/10 text-rp-navy hover:bg-rp-navy/20"
                      }`}
                    >
                      {isFollowing ? <FiUserCheck /> : <FiUserPlus />}
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {getCount(person?.followersCount ?? person?.followers)} followers
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {!loading && !error && (
          <Link
            to={viewMorePath}
            className="block w-full mt-4 text-center text-sm font-medium text-rp-navy bg-gray-50 hover:bg-gray-100 rounded-lg py-2"
          >
            View more
          </Link>
        )}
      </div>
    </aside>
  );
}