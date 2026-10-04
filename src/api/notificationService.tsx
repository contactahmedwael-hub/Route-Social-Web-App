import axiosInstance from "./axiosInstance";

/**
 * GET /notifications — paginated list. `unread: true` returns only unread ones.
 */
export const getNotifications = (params?: {
  unread?: boolean;
  page?: number;
  limit?: number;
}) => axiosInstance.get("/notifications", { params });

/**
 * GET /notifications/unread-count — how many notifications are unread.
 */
export const getUnreadCount = () => axiosInstance.get("/notifications/unread-count");

/**
 * PATCH /notifications/:id/read — mark one notification as read.
 */
export const markNotificationAsRead = (notificationId: string) =>
  axiosInstance.patch(`/notifications/${notificationId}/read`);

/**
 * PATCH /notifications/read-all — mark every notification as read.
 */
export const markAllNotificationsAsRead = () =>
  axiosInstance.patch("/notifications/read-all");