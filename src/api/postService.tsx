import axiosInstance from "./axiosInstance";

/**
 * GET /posts — every public post (used for the Community page).
 */
export const getAllPosts = (params?: Record<string, unknown>) =>
  axiosInstance.get("/posts", { params });

/**
 * GET /posts/feed — the current user's home feed.
 * Supports: only ("following" | ...), hasImage, page/limit, cursor/limit.
 */
export const getHomeFeed = (params?: Record<string, unknown>) =>
  axiosInstance.get("/posts/feed", { params });

/**
 * GET /posts/:id — a single post.
 */
export const getSinglePost = (postId: string) => axiosInstance.get(`/posts/${postId}`);

/**
 * POST /posts — create a post. multipart/form-data: `body` (text) and an
 * optional `image` file, per the Postman example.
 */
export const createPost = (formData: FormData) =>
  axiosInstance.post("/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * PUT /posts/:id — update a post. Same multipart shape as create.
 */
export const updatePost = (postId: string, formData: FormData) =>
  axiosInstance.put(`/posts/${postId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * DELETE /posts/:id — delete a post. No response body on success.
 */
export const deletePost = (postId: string) => axiosInstance.delete(`/posts/${postId}`);

/**
 * GET /posts/:id/likes — paginated list of users who liked a post.
 */
export const getPostLikes = (postId: string, params?: { page?: number; limit?: number }) =>
  axiosInstance.get(`/posts/${postId}/likes`, { params });

/**
 * PUT /posts/:id/like — toggles like/unlike. No response body on success.
 */
export const toggleLike = (postId: string) => axiosInstance.put(`/posts/${postId}/like`);

/**
 * PUT /posts/:id/bookmark — toggles bookmark/unbookmark. No response body.
 */
export const toggleBookmark = (postId: string) =>
  axiosInstance.put(`/posts/${postId}/bookmark`);

/**
 * POST /posts/:id/share — share a post with an optional caption/body.
 * The endpoint returns no response body on success.
 */
export const sharePost = (postId: string, body: string) =>
  axiosInstance.post(`/posts/${postId}/share`, { body });
