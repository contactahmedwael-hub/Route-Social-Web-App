import type { User } from "../types";

const TOKEN_KEY = "token";
const USER_KEY = "user";

// Earlier versions kept the login in localStorage, which survives closing
// the tab. Wipe those leftovers so nobody stays logged in from the old setup.
try {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
} catch {
  // storage unavailable — nothing to clean up
}

// sessionStorage is cleared by the browser when the tab is closed, which is
// exactly the "log in again after closing the tab" behavior we want.
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user?: User | null) {
  sessionStorage.setItem(TOKEN_KEY, token);
  if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function saveUser(user: User) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

// Fired by the axios layer when the API rejects our token (expired/invalid),
// so AuthContext can log out and the route guard sends the user to /auth/login.
export const UNAUTHORIZED_EVENT = "auth:unauthorized";