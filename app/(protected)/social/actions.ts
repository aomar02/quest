"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/types";
import { isValidCommentBody } from "@/lib/social/shared";
import { getComments, getNotifications } from "@/lib/social/data";
import type { CommentNode, NotificationView } from "@/lib/social/shared";

// Optional hints the client passes so the server can revalidate the right
// surface after a write — the game page for review threads, the collection
// page for collection threads. Neither is trusted for auth; they only pick a
// cache path.
type RevalidateHint = { igdbId?: number; collectionId?: string };

function revalidate(hint: RevalidateHint) {
  if (hint.collectionId) revalidatePath(`/collections/${hint.collectionId}`);
  if (hint.igdbId) revalidatePath(`/games/${hint.igdbId}`);
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

type AddCommentInput = {
  reviewId?: string;
  collectionId?: string;
  parentId?: string;
  igdbId?: number;
  body: string;
};

type AddCommentResult =
  | { ok: true; id: string; created_at: string }
  | { ok: false; error: string };

/**
 * Posts a comment (top-level when only a target is given, or a reply when
 * `parentId` is set — a reply inherits its parent's target via a DB trigger).
 * RLS forces the row's user_id to the caller, and the entity comment_count plus
 * the recipient's notification are maintained by triggers, so this stays a
 * single insert. Returns the new id/timestamp; the client renders the rest from
 * its own session (avatar, name), keeping the post snappy.
 */
export async function addComment(
  input: AddCommentInput,
): Promise<AddCommentResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const body = input.body.trim();
  if (!isValidCommentBody(body)) {
    return { ok: false, error: "التعليق فارغ أو طويل جداً" };
  }

  const supabase = await createSupabaseServerClient();

  // A reply carries only parent_id; the trigger fills review_id/collection_id.
  // A top-level comment must carry exactly one target.
  const row: {
    user_id: string;
    body: string;
    parent_id?: string;
    review_id?: string;
    collection_id?: string;
  } = { user_id: userId, body };

  if (input.parentId) row.parent_id = input.parentId;
  else if (input.reviewId) row.review_id = input.reviewId;
  else if (input.collectionId) row.collection_id = input.collectionId;
  else return { ok: false, error: "هدف غير صالح" };

  const { data, error } = await supabase
    .from("comments")
    .insert(row)
    .select("id, created_at")
    .single();

  if (error || !data) return { ok: false, error: "تعذر نشر التعليق" };

  revalidate({ igdbId: input.igdbId, collectionId: input.collectionId });
  return { ok: true, id: data.id, created_at: data.created_at };
}

/**
 * Soft-deletes the caller's comment: the row stays (so replies underneath it
 * aren't orphaned) but its body is cleared and `deleted_at` is set, and the
 * client renders it as "(this comment was deleted)". RLS limits this to the
 * caller's own row.
 */
export async function deleteComment(
  commentId: string,
  hint: RevalidateHint = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("comments")
    .update({ body: "", deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: "تعذر حذف التعليق" };

  revalidate(hint);
  return { ok: true };
}

/**
 * Loads the comment thread for a target, callable from client components (the
 * review modal fetches on open). Server-rendered surfaces use `getComments`
 * from the data layer directly instead.
 */
export async function getCommentThread(
  target: { reviewId: string } | { collectionId: string },
): Promise<CommentNode[]> {
  const { userId } = await auth();
  if (!userId) return [];
  return getComments(target, userId);
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

type ToggleLikeInput = {
  reviewId?: string;
  collectionId?: string;
  commentId?: string;
  igdbId?: number;
};

type ToggleLikeResult =
  | { ok: true; liked: boolean }
  | { ok: false; error: string };

/**
 * Toggles the caller's like on a review, collection, or comment. The like_count
 * on the target and the owner's notification are maintained by triggers. The
 * partial unique index makes a double-tap idempotent — a duplicate insert is
 * treated as "already liked".
 */
export async function toggleLike(
  input: ToggleLikeInput,
): Promise<ToggleLikeResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const column = input.reviewId
    ? "review_id"
    : input.collectionId
      ? "collection_id"
      : input.commentId
        ? "comment_id"
        : null;
  const targetId =
    input.reviewId ?? input.collectionId ?? input.commentId ?? null;
  if (!column || !targetId) return { ok: false, error: "هدف غير صالح" };

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: selectError } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", userId)
    .eq(column, targetId)
    .maybeSingle();
  if (selectError) return { ok: false, error: "تعذر تحديث الإعجاب" };

  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("id", existing.id);
    if (error) return { ok: false, error: "تعذر إزالة الإعجاب" };
    revalidate({ igdbId: input.igdbId, collectionId: input.collectionId });
    return { ok: true, liked: false };
  }

  const insertRow: TablesInsert<"likes"> = { user_id: userId };
  if (input.reviewId) insertRow.review_id = input.reviewId;
  else if (input.collectionId) insertRow.collection_id = input.collectionId;
  else insertRow.comment_id = input.commentId;
  const { error } = await supabase.from("likes").insert(insertRow);
  if (error) {
    // A unique-violation means a concurrent insert already liked it — that's the
    // desired end state, not a failure.
    if (error.code === "23505") return { ok: true, liked: true };
    return { ok: false, error: "تعذر تسجيل الإعجاب" };
  }

  revalidate({ igdbId: input.igdbId, collectionId: input.collectionId });
  return { ok: true, liked: true };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/** The viewer's recent notifications + unread count, for the bell. */
export async function fetchNotifications(): Promise<{
  items: NotificationView[];
  unread: number;
}> {
  const { userId } = await auth();
  if (!userId) return { items: [], unread: 0 };
  return getNotifications(userId);
}

/** Marks all of the viewer's unread notifications as read. */
export async function markNotificationsRead(): Promise<{ ok: boolean }> {
  const { userId } = await auth();
  if (!userId) return { ok: false };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);

  return { ok: !error };
}
