import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiSearch, FiUsers, FiUserPlus, FiUserCheck } from "react-icons/fi";
import Avatar from "../components/ui/Avatar";
import {
  useFollowSuggestions,
  useUserSearch,
  getSuggestionId,
} from "../hooks/useFollowSuggestions";
import { useAuth } from "../context/AuthContext";
import {
  getUserName,
  getUserHandle,
  getUserAvatar,
  getCount,
  getProfilePath,
} from "../utils/postHelpers";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const INITIAL_LIMIT = 20;
const LOAD_MORE_STEP = 20;

export default function AllSuggestedFriends() {
  useDocumentTitle("Suggested Friends");
  const { user: currentUser } = useAuth();
  const currentUserId = (currentUser?._id || currentUser?.id) as string | undefined;
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [searchParams] = useSearchParams();
  // "View more" in the sidebar passes what was typed there as ?search=…
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const isSearching = query.trim().length > 0;

  // Separate hooks: the list below browses suggestions, while searching walks
  // through every user. Their loading/error states stay independent, so
  // clearing the box never leaves a search error on screen.
  const suggestions = useFollowSuggestions(limit);
  const search = useUserSearch(query);
  const { loading, error, followingIds, pendingIds, toggleFollowFor } = isSearching
    ? search
    : suggestions;
  const filtered = isSearching ? search.results : suggestions.people;

  // The API only takes a `limit`, not an offset/page — so "loading more"
  // means refetching with a bigger limit. Once a fetch comes back with
  // fewer people than we asked for, we've reached the end of the list.
  const reachedEnd = !suggestions.loading && suggestions.people.length < limit;

  const handleLoadMore = () => setLimit((l) => l + LOAD_MORE_STEP);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        to="/feed"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 mb-4"
      >
        <FiArrowLeft /> Back to feed
      </Link>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <FiUsers className="text-rp-navy" /> All Suggested Friends
          </h1>
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {filtered.length}
          </span>
        </div>

        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-rp-navy/20 focus:border-rp-navy"
          />
        </div>

        {loading && filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
        )}
        {!loading && error && <p className="text-sm text-red-500 py-4 text-center">{error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No friends found.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((person) => {
            const id = getSuggestionId(person);
            const isFollowing = followingIds.has(id);
            const isPending = pendingIds.has(id);
            return (
              <div
                key={id}
                className="flex items-start justify-between gap-2 border border-gray-100 rounded-lg p-3"
              >
                <Link
                  to={getProfilePath(person, currentUserId)}
                  className="flex items-start gap-3 min-w-0 group"
                >
                  <Avatar src={getUserAvatar(person)} name={getUserName(person)} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:underline">
                      {getUserName(person)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{getUserHandle(person)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {getCount(person?.followersCount ?? person?.followers)} followers
                    </p>
                  </div>
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
            );
          })}
        </div>

        {isSearching && search.hasMore && !error && (
          <button
            onClick={search.loadMore}
            disabled={search.loadingMore}
            className="w-full mt-4 text-sm font-semibold text-rp-navy bg-gray-50 hover:bg-gray-100 disabled:opacity-60 rounded-lg py-2.5"
          >
            {search.loadingMore ? "Loading…" : "Load more results"}
          </button>
        )}

        {!isSearching && !reachedEnd && !error && (
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="w-full mt-4 text-sm font-semibold text-rp-navy bg-gray-50 hover:bg-gray-100 disabled:opacity-60 rounded-lg py-2.5"
          >
            {loading ? "Loading…" : "Load more friends"}
          </button>
        )}
      </div>
    </div>
  );
}