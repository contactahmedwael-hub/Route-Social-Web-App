import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiCheck, FiHeart, FiMessageCircle, FiShare2, FiUserPlus } from "react-icons/fi";
import { LuCheckCheck } from "react-icons/lu";
import Avatar from "../components/ui/Avatar";
import { useAuth } from "../context/AuthContext";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../api/notificationService";
import {
  extractHasMore,
  extractNotifications,
  getNotificationActor,
  getNotificationId,
  getNotificationKind,
  getNotificationLink,
  getNotificationParts,
  getNotificationPreview,
  isNotificationRead,
  mergeNotifications,
  type NotificationKind,
} from "../utils/notificationResponse";
import { formatRelativeTime, getUserAvatar, getUserId, getUserName } from "../utils/postHelpers";
import {
  addReadNotifications,
  getReadNotifications,
  removeReadNotification,
} from "../utils/readNotifications";
import type { Notification } from "../types";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const PAGE_SIZE = 10;

type Filter = "all" | "unread";

const KIND_ICON: Record<NotificationKind, typeof FiBell> = {
  like: FiHeart,
  comment: FiMessageCircle,
  reply: FiMessageCircle,
  share: FiShare2,
  follow: FiUserPlus,
  other: FiBell,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  like: "text-rose-500",
  comment: "text-blue-600",
  reply: "text-blue-600",
  share: "text-emerald-600",
  follow: "text-purple-600",
  other: "text-gray-500",
};

function asRead(n: Notification): Notification {
  return { ...n, isRead: true, read: true };
}

function asUnread(n: Notification): Notification {
  return { ...n, isRead: false, read: false };
}

export default function Notifications() {
  useDocumentTitle("Notifications");
  const {
    user,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
    adjustUnreadNotificationsCount,
  } = useAuth();
  const userId = getUserId(user);
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Guards against a slow response from a previous filter overwriting the
  // list after the user has already switched tabs.
  const requestId = useRef(0);

  const load = useCallback(async (nextPage: number, activeFilter: Filter) => {
    const id = ++requestId.current;
    if (nextPage === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const { data } = await getNotifications({
        unread: activeFilter === "unread",
        page: nextPage,
        limit: PAGE_SIZE,
      });
      if (id !== requestId.current) return;

      // Notifications read earlier in this browser are kept locally. They stay
      // read after a refresh, and in the All tab they are shown again even if
      // the API no longer returns them. The Unread tab never shows them.
      const stored = getReadNotifications(userId);
      const readIds = new Set(stored.map(getNotificationId));
      let list = extractNotifications(data).map((n) =>
        readIds.has(getNotificationId(n)) ? asRead(n) : n
      );

      if (activeFilter === "unread") {
        list = list.filter((n) => !isNotificationRead(n));
        setItems((prev) => (nextPage === 1 ? list : mergeNotifications(prev, list)));
      } else {
        // Anything the server already reports as read is saved locally too.
        addReadNotifications(userId, list.filter(isNotificationRead));
        setItems((prev) =>
          nextPage === 1
            ? mergeNotifications(list, stored.map(asRead))
            : mergeNotifications(prev, list)
        );
      }
      setPage(nextPage);
      setHasMore(extractHasMore(data, list.length, PAGE_SIZE));
    } catch (err: any) {
      if (id !== requestId.current) return;
      setError(err?.response?.data?.message || "Couldn’t load notifications. Try again.");
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    setItems([]);
    setHasMore(false);
    load(1, filter);
  }, [filter, load]);

  // Marks one notification as read. The row stays in the list (also in the
  // Unread tab) and just switches to its "Read" look; it only drops out of the
  // Unread tab the next time that tab is loaded.
  const handleMarkRead = async (notification: Notification) => {
    const id = getNotificationId(notification);
    if (!id || isNotificationRead(notification)) return;

    // Optimistic: flip it right away, undo if the request fails.
    setItems((prev) => prev.map((n) => (getNotificationId(n) === id ? asRead(n) : n)));
    adjustUnreadNotificationsCount(-1);
    addReadNotifications(userId, [asRead(notification)]);
    try {
      await markNotificationAsRead(id);
    } catch {
      removeReadNotification(userId, id);
      setItems((prev) => prev.map((n) => (getNotificationId(n) === id ? asUnread(n) : n)));
      adjustUnreadNotificationsCount(1);
    }
  };

  const handleOpen = (notification: Notification) => {
    handleMarkRead(notification);
    const link = getNotificationLink(notification);
    if (link) navigate(link);
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      addReadNotifications(userId, items.map(asRead));
      setUnreadNotificationsCount(0);
      setItems((prev) => prev.map(asRead));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Couldn’t mark notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  };

  const hasUnread = unreadNotificationsCount > 0 || items.some((n) => !isNotificationRead(n));

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
      active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <header className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Realtime updates for likes, comments, shares, and follows.
          </p>
          <div className="flex items-center gap-2 mt-4" role="tablist" aria-label="Filter notifications">
            <button
              role="tab"
              aria-selected={filter === "all"}
              onClick={() => setFilter("all")}
              className={tabClass(filter === "all")}
            >
              All
            </button>
            <button
              role="tab"
              aria-selected={filter === "unread"}
              onClick={() => setFilter("unread")}
              className={tabClass(filter === "unread")}
            >
              Unread
              {unreadNotificationsCount > 0 && (
                <span
                  className={`min-w-5 h-5 px-1.5 rounded-full text-[11px] font-semibold leading-5 text-center ${
                    filter === "unread" ? "bg-white/90 text-blue-600" : "bg-white text-blue-600"
                  }`}
                >
                  {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <button
          onClick={handleMarkAll}
          disabled={!hasUnread || markingAll}
          className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 enabled:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LuCheckCheck className="text-base" />
          <span className="hidden sm:inline">{markingAll ? "Marking…" : "Mark all as read"}</span>
        </button>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
            Loading notifications…
          </div>
        ) : error && items.length === 0 ? (
          <div className="rounded-xl border border-red-100 bg-red-50 py-10 text-center text-sm text-red-600">
            <p>{error}</p>
            <button
              onClick={() => load(1, filter)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-white border border-red-200 font-semibold hover:bg-red-50"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500">
            {filter === "unread" ? "No unread notifications." : "No notifications yet."}
          </div>
        ) : (
          <>
            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <ul className="space-y-2">
              {items.map((notification, index) => (
                <NotificationRow
                  key={getNotificationId(notification) || index}
                  notification={notification}
                  onOpen={handleOpen}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </ul>

            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => load(page + 1, filter)}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function NotificationRow({
  notification,
  onOpen,
  onMarkRead,
}: {
  notification: Notification;
  onOpen: (n: Notification) => void;
  onMarkRead: (n: Notification) => void;
}) {
  const actor = getNotificationActor(notification);
  const kind = getNotificationKind(notification);
  const Icon = KIND_ICON[kind];
  const read = isNotificationRead(notification);
  const { actorName, action } = getNotificationParts(notification);
  const preview = getNotificationPreview(notification);
  const time = formatRelativeTime(notification.createdAt);

  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <li>
      {/* A div, not a <button>/<Link>, because the row contains its own button. */}
      <div
        role="link"
        tabIndex={0}
        onClick={() => onOpen(notification)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onOpen(notification);
        }}
        className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${
          read
            ? "border-gray-200 bg-white hover:bg-gray-50"
            : "border-blue-100 bg-blue-50 hover:bg-blue-100/60"
        }`}
      >
        <span className="flex flex-col items-center shrink-0">
          <Avatar src={getUserAvatar(actor)} name={actor ? getUserName(actor) : "Route"} size="md" />
          <span className="-mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-100">
            <Icon className={`text-sm ${KIND_COLOR[kind]}`} />
          </span>
        </span>

        <div className="flex-1 min-w-0 text-sm">
          <p className="text-gray-700">
            {actorName && <span className="font-bold text-gray-900">{actorName} </span>}
            {action}
          </p>
          {preview && <p className="mt-1 text-gray-500 break-words line-clamp-2">{preview}</p>}

          <div className="mt-2">
            {read ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                <FiCheck /> Read
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  onMarkRead(notification);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-gray-50"
              >
                <FiCheck /> Mark as read
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs text-gray-400">
          {time && <span>{time}</span>}
          {!read && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-label="Unread" />}
        </div>
      </div>
    </li>
  );
}