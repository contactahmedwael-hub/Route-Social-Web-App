import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getMyProfile } from "../api/userService";
import { extractProfile } from "../utils/profileResponse";
import {
  getToken,
  getStoredUser,
  saveSession,
  saveUser,
  clearSession,
  UNAUTHORIZED_EVENT,
} from "../utils/session";
import type { User } from "../types";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (authToken: string, userData?: User | null) => void;
  logout: () => void;
  refreshProfile: () => Promise<User | null>;
  updateUser: (partial: Partial<User>) => void;
  bookmarksCount: number;
  setBookmarksCount: (count: number) => void;
  adjustBookmarksCount: (delta: number) => void;
  unreadNotificationsCount: number;
  setUnreadNotificationsCount: (count: number) => void;
  adjustUnreadNotificationsCount: (delta: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Session lives in sessionStorage: it survives a refresh but is wiped when
  // the tab is closed, so the user has to log in again next time.
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  // Tracked globally (not just on the Saved page) so the Bookmarks stat on
  // the profile page updates the instant a post is bookmarked/unbookmarked
  // from anywhere in the app, not only after visiting Saved. Whichever page
  // actually fetches the real bookmarks list calls setBookmarksCount to
  // correct any drift; toggling from a post card calls adjustBookmarksCount
  // for an instant optimistic update in between.
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const adjustBookmarksCount = useCallback((delta: number) => {
    setBookmarksCount((n) => Math.max(0, n + delta));
  }, []);

  // Drives the badge on the navbar bell. The navbar fetches the real number;
  // the Notifications page adjusts it optimistically as items are read.
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const adjustUnreadNotificationsCount = useCallback((delta: number) => {
    setUnreadNotificationsCount((n) => Math.max(0, n + delta));
  }, []);

  const login = useCallback((authToken: string, userData?: User | null) => {
    saveSession(authToken, userData);
    setToken(authToken);
    setUser(userData ?? null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
    setBookmarksCount(0);
    setUnreadNotificationsCount(0);
  }, []);

  // The API rejected our token (expired/invalid) — log out so ProtectedRoute
  // sends the user back to /auth/login.
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  // Merge new fields into the current user (e.g. an optimistic update right
  // after a photo upload, before/without a full profile refetch). Merging
  // — rather than replacing — means it can never wipe out fields the caller
  // doesn't know about.
  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => {
      const next = { ...(prev ?? {}), ...partial };
      saveUser(next);
      return next;
    });
  }, []);

  // Refreshes the full profile (avatar, bio, counts, etc.) from
  // GET /users/profile-data. Merged (not replaced) so that if this response
  // is missing/renames a field, it can't erase data set elsewhere.
  const refreshProfile = useCallback(async () => {
    const { data } = await getMyProfile();
    const profile: User | null = extractProfile(data);
    if (profile) {
      setUser((prev) => {
        const next = { ...(prev ?? {}), ...profile };
        saveUser(next);
        return next;
      });
    }
    return profile;
  }, []);

  const value: AuthContextValue = {
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    logout,
    refreshProfile,
    updateUser,
    bookmarksCount,
    setBookmarksCount,
    adjustBookmarksCount,
    unreadNotificationsCount,
    setUnreadNotificationsCount,
    adjustUnreadNotificationsCount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}