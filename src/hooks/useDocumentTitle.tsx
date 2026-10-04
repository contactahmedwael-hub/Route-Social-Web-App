import { useEffect } from "react";

export const APP_NAME = "Route Posts";

/**
 * Sets the browser tab title for the current page, e.g. "Notifications | Route Posts".
 * With no title it falls back to just "Route Posts". The title is reset when the
 * page unmounts, so a page never leaves a stale title behind.
 *
 * Pass a changing value (like a user's name once it loads) and the tab follows it.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}