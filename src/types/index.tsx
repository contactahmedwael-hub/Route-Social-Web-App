// The exact response shape for users/posts hasn't been confirmed against
// the live API yet (Create Post / Get Single Post are coming later), so
// these types are intentionally permissive — they document the field
// names the app currently reads (see src/utils/postHelpers.ts) without
// locking us into a shape we haven't verified.

export interface User {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  username?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  profilePhoto?: string;
  photo?: string;
  avatar?: string;
  image?: string;
  followersCount?: number;
  followers?: unknown[];
  [key: string]: unknown;
}

export interface Post {
  _id?: string;
  id?: string;
  user?: User;
  owner?: User;
  author?: User;
  createdBy?: User;
  body?: string;
  content?: string;
  text?: string;
  caption?: string;
  image?: string;
  photo?: string;
  media?: { url: string }[];
  createdAt?: string;
  created_at?: string;
  date?: string;
  privacy?: string;
  visibility?: string;
  likesCount?: number;
  likes?: unknown[];
  commentsCount?: number;
  comments?: unknown[];
  sharesCount?: number;
  shares?: unknown[];
  sharedPost?: Post;
  originalPost?: Post;
  repost?: Post;
  [key: string]: unknown;
}

export interface Comment {
  _id?: string;
  id?: string;
  commentCreator?: User; // confirmed field name from the live API
  user?: User;
  owner?: User;
  author?: User;
  createdBy?: User;
  content?: string;
  body?: string;
  text?: string;
  image?: string;
  photo?: string;
  createdAt?: string;
  created_at?: string;
  date?: string;
  likesCount?: number;
  likes?: unknown[];
  repliesCount?: number;
  replies?: unknown[];
  [key: string]: unknown;
}

export interface RegisterFormValues {
  name: string;
  username?: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  password: string;
  rePassword: string;
}

export interface LoginFormValues {
  login: string;
  password: string;
}
// Field names are read defensively (see src/utils/notificationResponse.tsx)
// because the notifications payload shape is only documented by its endpoints.
export interface Notification {
  _id?: string;
  id?: string;
  type?: string;
  message?: string;
  text?: string;
  body?: string;
  actor?: User;
  sender?: User;
  from?: User;
  user?: User;
  createdBy?: User;
  isRead?: boolean;
  read?: boolean;
  entityId?: string;
  postId?: string;
  post?: Post | string;
  createdAt?: string;
  [key: string]: unknown;
}