import type { User } from "../types";

export interface AuthPayload {
  token: string | null;
  user: User | null;
}

/**
 * The signup/signin response shape hasn't been confirmed against the real
 * API yet. This tries every common shape so a mismatch doesn't silently
 * break the login redirect. If you confirm the real shape, this is the
 * only place that needs to change.
 */
export function extractAuthPayload(data: Record<string, unknown> | undefined): AuthPayload {
  if (!data) return { token: null, user: null };

  const nestedData = data.data as Record<string, unknown> | undefined;

  const token =
    (data.token as string | undefined) ||
    (data.accessToken as string | undefined) ||
    (data.access_token as string | undefined) ||
    (data.jwt as string | undefined) ||
    (nestedData?.token as string | undefined) ||
    (nestedData?.accessToken as string | undefined) ||
    null;

  const user =
    (data.user as User | undefined) ||
    (nestedData?.user as User | undefined) ||
    // Some APIs return the user object directly under `data`, with the
    // token as a sibling — guard against `data.data` actually being the
    // token string itself.
    (typeof nestedData === "object" &&
    nestedData !== null &&
    !Array.isArray(nestedData) &&
    nestedData.token === undefined
      ? (nestedData as User)
      : null);

  return { token, user };
}
