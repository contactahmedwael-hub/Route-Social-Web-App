import type { Notification } from "../types";

/**
 * Keeps the notifications the user has read in this browser (the full
 * notification, not just its id) so the panel can show them again after a
 * refresh, even when the API doesn't return them.
 *
 * The server is still told about every read (PATCH /notifications/:id/read);
 * this is the local copy. Stored per user so two accounts on the same browser
 * don't share it.
 */

const MAX_STORED = 300;

const KEY_PREFIX = "rp_read_notifications_";
const V2_PREFIX = `${KEY_PREFIX}v2_`;

const storageKey = (userId: string) => `${V2_PREFIX}${userId || "anon"}`;

// The first version stored only ids under `rp_read_notifications_<userId>`.
// Nothing reads those any more, so remove them (once per page load).
let legacyCleared = false;
function clearLegacyKeys() {
  if (legacyCleared) return;
  legacyCleared = true;
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(KEY_PREFIX) && !key.startsWith(V2_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable — nothing to clean
  }
}

const idOf = (n: Notification): string => String(n?._id || n?.id || "");

const timeOf = (n: Notification): number => {
  const t = Date.parse(String(n?.createdAt ?? ""));
  return Number.isNaN(t) ? 0 : t;
};

export function getReadNotifications(userId: string): Notification[] {
  clearLegacyKeys();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => n && idOf(n)) : [];
  } catch {
    return [];
  }
}

function save(userId: string, list: Notification[]) {
  try {
    // Newest first; keep only the most recent entries so this can't grow forever.
    const trimmed = [...list].sort((a, b) => timeOf(b) - timeOf(a)).slice(0, MAX_STORED);
    localStorage.setItem(storageKey(userId), JSON.stringify(trimmed));
  } catch {
    // storage full or unavailable — not critical
  }
}

export function addReadNotifications(userId: string, notifications: Notification[]) {
  const byId = new Map<string, Notification>();
  getReadNotifications(userId).forEach((n) => byId.set(idOf(n), n));
  notifications.forEach((n) => {
    const id = idOf(n);
    if (id) byId.set(id, { ...n, isRead: true, read: true });
  });
  save(userId, Array.from(byId.values()));
}

export function removeReadNotification(userId: string, id: string) {
  save(
    userId,
    getReadNotifications(userId).filter((n) => idOf(n) !== id)
  );
}