import axiosInstance from "./axiosInstance";

/**
 * GET /posts/:postId/comments — paginated comments for a post.
 */
export const getComments = (postId: string, params?: { page?: number; limit?: number }) =>
  axiosInstance.get(`/posts/${postId}/comments`, { params });

/**
 * POST /posts/:postId/comments — multipart/form-data: `content` + optional `image`.
 */
export const createComment = (postId: string, formData: FormData) =>
  axiosInstance.post(`/posts/${postId}/comments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * GET /posts/:postId/comments/:commentId/replies — paginated replies.
 */
export const getReplies = (
  postId: string,
  commentId: string,
  params?: { page?: number; limit?: number }
) => axiosInstance.get(`/posts/${postId}/comments/${commentId}/replies`, { params });

/**
 * POST /posts/:postId/comments/:commentId/replies — same shape as a comment.
 */
export const createReply = (postId: string, commentId: string, formData: FormData) =>
  axiosInstance.post(`/posts/${postId}/comments/${commentId}/replies`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * PUT /posts/:postId/comments/:commentId — update a comment or reply
 * (replies are addressed by their own id under the same comments route).
 */
export const updateComment = (postId: string, commentId: string, formData: FormData) =>
  axiosInstance.put(`/posts/${postId}/comments/${commentId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * DELETE /posts/:postId/comments/:commentId
 */
export const deleteComment = (postId: string, commentId: string) =>
  axiosInstance.delete(`/posts/${postId}/comments/${commentId}`);

/**
 * PUT /posts/:postId/comments/:commentId/like — toggles like/unlike.
 */
export const toggleCommentLike = (postId: string, commentId: string) =>
  axiosInstance.put(`/posts/${postId}/comments/${commentId}/like`);
