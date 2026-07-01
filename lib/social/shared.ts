// Shared, client-safe types and constants for the social layer (comments,
// likes, notifications). No server imports here — both client components and
// the server data/action layers import from this file.

export const COMMENT_BODY_MAX = 2000;

export function isValidCommentBody(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length >= 1 && trimmed.length <= COMMENT_BODY_MAX;
}

// The two things a comment (or top-level like) can target. Exactly one is set.
export type CommentTarget = { reviewId: string } | { collectionId: string };

// What a "like" can point at — a review, a collection, or a single comment.
export type LikeTarget =
  | { reviewId: string }
  | { collectionId: string }
  | { commentId: string };

export type CommentAuthor = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

// A comment plus its nested replies, the viewer's like state, and whether the
// viewer owns it (so the UI can show a delete button). `replies` is the direct
// children; arbitrary depth is supported (Reddit-style).
export type CommentNode = {
  id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  user_id: string;
  parent_id: string | null;
  like_count: number;
  reply_count: number;
  author: CommentAuthor | null;
  viewer_liked: boolean;
  is_own: boolean;
  replies: CommentNode[];
};

export type NotificationType =
  | "review_like"
  | "review_comment"
  | "collection_like"
  | "collection_save"
  | "collection_comment"
  | "comment_reply"
  | "comment_like";

// A notification flattened for rendering: the actor, where it links, and the
// optional collection name used in the message.
export type NotificationView = {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  actor: CommentAuthor | null;
  href: string;
  collection_name: string | null;
};
