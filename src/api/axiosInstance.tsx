import axios, { type InternalAxiosRequestConfig } from "axios";
import { getToken, clearSession, UNAUTHORIZED_EVENT } from "../utils/session";

export const BASE_URL = "https://route-posts.routemisr.com";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the session token (if present) to every outgoing request.
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the API rejects a request we sent a token with (expired/invalid token),
// drop the session and tell AuthContext so the route guard redirects to login.
// Requests sent without a token (e.g. a wrong-password signin) are left alone.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadToken = Boolean(error?.config?.headers?.Authorization);
    if (error?.response?.status === 401 && hadToken) {
      clearSession();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;