import axiosInstance from "./axiosInstance";

/**
 * GET /users/profile-data — the logged-in user's own profile.
 */
export const getMyProfile = () => axiosInstance.get("/users/profile-data");

/**
 * PUT /users/upload-photo — multipart form upload, field name is a guess
 * ("photo") until confirmed against the Postman body — adjust here only.
 */
export const uploadProfilePhoto = (file: File) => {
  const formData = new FormData();
  formData.append("photo", file);
  return axiosInstance.put("/users/upload-photo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/**
 * PUT /users/upload-cover — multipart form upload of the cover photo.
 *
 * Only the URL was given, so the HTTP method and the form field name are
 * detected on the first upload: PUT is tried before POST, and the field
 * "cover" before a few alternatives. A combination only counts as wrong when
 * the server answers 404/405 (method) or 400/422 (field); any other failure
 * (network, 401, too large) is reported straight away. The combination that
 * works is remembered, and the console says which one it was — after that
 * this can be pinned to it.
 */
const COVER_METHODS = ["put", "post"] as const;
const COVER_FIELDS = ["cover", "coverPhoto", "coverImage", "photo"];
const COVER_MODE_KEY = "rp_cover_upload_mode";

function savedCoverMode(): { method: (typeof COVER_METHODS)[number]; field: string } | null {
  try {
    const [method, field] = (localStorage.getItem(COVER_MODE_KEY) ?? "").split(":");
    if ((method === "put" || method === "post") && field) return { method, field };
  } catch {
    // storage unavailable — detect again
  }
  return null;
}

export async function uploadCoverPhoto(file: File) {
  const saved = savedCoverMode();
  const methods = saved ? [saved.method] : COVER_METHODS;
  const fields = saved ? [saved.field] : COVER_FIELDS;

  let lastError: unknown;
  for (const method of methods) {
    for (const field of fields) {
      const formData = new FormData();
      formData.append(field, file);
      try {
        const response = await axiosInstance.request({
          method,
          url: "/users/upload-cover",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });
        try {
          localStorage.setItem(COVER_MODE_KEY, `${method}:${field}`);
        } catch {
          // fine — it is just detected again next time
        }
        console.info(`Cover upload worked with ${method.toUpperCase()} and field "${field}".`);
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.response?.status;
        if (status === 404 || status === 405) break; // wrong method: try the next one
        if (status === 400 || status === 422) continue; // wrong field: try the next one
        throw err; // anything else is a real failure
      }
    }
  }
  throw lastError;
}

/**
 * Removes the cover photo.
 *
 * The remove request isn't documented, so the first removal tries the likely
 * ones in turn — a 404/405 means "not this one" and the next is tried; any
 * other answer (success, 401, 400, ...) ends the search. The one that works is
 * remembered, and the console says which it was so it can be pinned here.
 */
const REMOVE_COVER_ATTEMPTS: { method: "delete" | "put" | "patch"; url: string }[] = [
  { method: "delete", url: "/users/upload-cover" },
  { method: "delete", url: "/users/remove-cover" },
  { method: "delete", url: "/users/delete-cover" },
  { method: "delete", url: "/users/cover" },
  { method: "put", url: "/users/remove-cover" },
  { method: "patch", url: "/users/remove-cover" },
  { method: "put", url: "/users/delete-cover" },
];
const REMOVE_COVER_KEY = "rp_cover_remove_mode";

function savedRemoveMode(): (typeof REMOVE_COVER_ATTEMPTS)[number] | null {
  try {
    const [method, url] = (localStorage.getItem(REMOVE_COVER_KEY) ?? "").split(" ");
    return REMOVE_COVER_ATTEMPTS.find((a) => a.method === method && a.url === url) ?? null;
  } catch {
    return null;
  }
}

export async function removeCoverPhoto() {
  const saved = savedRemoveMode();
  const attempts = saved ? [saved] : REMOVE_COVER_ATTEMPTS;

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const response = await axiosInstance.request({ method: attempt.method, url: attempt.url });
      try {
        localStorage.setItem(REMOVE_COVER_KEY, `${attempt.method} ${attempt.url}`);
      } catch {
        // fine — it is just detected again next time
      }
      console.info(`Cover removal worked with ${attempt.method.toUpperCase()} ${attempt.url}.`);
      return response;
    } catch (err: any) {
      lastError = err;
      const status = err?.response?.status;
      if (status === 404 || status === 405) continue;
      throw err;
    }
  }
  throw lastError;
}

/**
 * GET /users/bookmarks — posts the current user has saved.
 */
export const getBookmarks = (params?: Record<string, unknown>) =>
  axiosInstance.get("/users/bookmarks", { params });

/**
 * GET /users/suggestions?limit=10 — follow suggestions.
 */
export const getSuggestions = (limit = 10) =>
  axiosInstance.get("/users/suggestions", { params: { limit } });

/**
 * GET /users/suggestions?page=&limit= — one page of follow suggestions.
 * Used to walk through every page when searching for users.
 */
export const getSuggestionsPage = (
  page: number,
  limit: number,
  extraParams?: Record<string, unknown>
) => axiosInstance.get("/users/suggestions", { params: { page, limit, ...extraParams } });

/**
 * GET /users/:id/profile — another (or the same) user's public profile.
 */
export const getUserProfile = (userId: string) =>
  axiosInstance.get(`/users/${userId}/profile`);

/**
 * PUT /users/:id/follow — toggles follow/unfollow for that user.
 */
export const toggleFollow = (userId: string) =>
  axiosInstance.put(`/users/${userId}/follow`);

/**
 * GET /users/:id/posts — a specific user's posts (nested route).
 */
export const getUserPosts = (userId: string, params?: Record<string, unknown>) =>
  axiosInstance.get(`/users/${userId}/posts`, { params });