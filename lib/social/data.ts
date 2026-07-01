import { clerkClient } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CommentAuthor,
  CommentNode,
  NotificationType,
  NotificationView,
} from "./shared";

// Author embed for comments. Named after the FK so PostgREST resolves it even
// if more relationships to `profiles` are added to `comments` later.
const COMMENT_AUTHOR_EMBED =
  "author:profiles!comments_user_id_fkey(user_id, username, display_name)";

// Hard cap on comments shipped for one target in a single load. A review/
// collection thread well past this is an edge case; the first N (oldest-first,
// so threads stay stable) are plenty for the UI.
const COMMENTS_LIMIT = 300;
const NOTIFICATIONS_LIMIT = 30;

// The author shape PostgREST returns from the embed — same as CommentAuthor but
// without avatar_url, which lives on the Clerk user and is filled in afterwards.
type EmbeddedAuthor = Omit<CommentAuthor, "avatar_url">;

type RawComment = {
  id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  user_id: string;
  parent_id: string | null;
  like_count: number;
  reply_count: number;
  author: EmbeddedAuthor | null;
};

// A comment row after avatars have been attached.
type EnrichedComment = Omit<RawComment, "author"> & {
  author: CommentAuthor | null;
};

/**
 * Profiles don't store an avatar (it lives on the Clerk user), so any list of
 * rows carrying an `author` needs a follow-up batch lookup to fill avatar_url.
 * One Clerk request for the whole list, never one per row.
 */
async function attachAvatars<T extends { author: EmbeddedAuthor | null }>(
  rows: T[],
): Promise<(Omit<T, "author"> & { author: CommentAuthor | null })[]> {
  const userIds = [
    ...new Set(
      rows
        .map((row) => row.author?.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const avatarByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const clerk = await clerkClient();
    const { data: users } = await clerk.users.getUserList({
      userId: userIds,
      limit: userIds.length,
    });
    for (const user of users) avatarByUserId.set(user.id, user.imageUrl);
  }

  return rows.map((row) => ({
    ...row,
    author: row.author
      ? { ...row.author, avatar_url: avatarByUserId.get(row.author.user_id) ?? null }
      : null,
  }));
}

/**
 * Loads the full comment thread for a review or collection as a nested tree.
 * Top-level comments are newest-first; replies under each comment are oldest-
 * first (chronological), matching how Reddit reads a conversation. Each node
 * carries the viewer's like state so the heart renders correctly on first paint.
 */
export async function getComments(
  target: { reviewId: string } | { collectionId: string },
  viewerId: string,
): Promise<CommentNode[]> {
  const supabase = await createSupabaseServerClient();

  const query = supabase
    .from("comments")
    .select(`*, ${COMMENT_AUTHOR_EMBED}`)
    .order("created_at", { ascending: true })
    .limit(COMMENTS_LIMIT);

  const filtered =
    "reviewId" in target
      ? query.eq("review_id", target.reviewId)
      : query.eq("collection_id", target.collectionId);

  const { data, error } = await filtered;
  if (error) throw error;

  const rows = (data ?? []) as RawComment[];
  if (rows.length === 0) return [];

  // Which of these comments has the viewer liked? One indexed lookup.
  const ids = rows.map((row) => row.id);
  const { data: likeRows, error: likeError } = await supabase
    .from("likes")
    .select("comment_id")
    .eq("user_id", viewerId)
    .in("comment_id", ids);
  if (likeError) throw likeError;
  const likedSet = new Set(
    (likeRows ?? []).map((row) => row.comment_id).filter(Boolean) as string[],
  );

  const withAvatars = await attachAvatars(rows);
  return buildCommentTree(withAvatars, likedSet, viewerId);
}

function buildCommentTree(
  rows: EnrichedComment[],
  likedSet: Set<string>,
  viewerId: string,
): CommentNode[] {
  const nodeById = new Map<string, CommentNode>();
  for (const row of rows) {
    nodeById.set(row.id, {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      deleted_at: row.deleted_at,
      user_id: row.user_id,
      parent_id: row.parent_id,
      like_count: row.like_count,
      reply_count: row.reply_count,
      author: row.author,
      viewer_liked: likedSet.has(row.id),
      is_own: row.user_id === viewerId,
      replies: [],
    });
  }

  const roots: CommentNode[] = [];
  // `rows` is chronological, so pushing in order keeps each `replies` array
  // oldest-first automatically.
  for (const row of rows) {
    const node = nodeById.get(row.id)!;
    const parent = row.parent_id ? nodeById.get(row.parent_id) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  // Top-level comments read newest-first.
  roots.reverse();
  return roots;
}

/**
 * The set of review ids (from the given list) the viewer has liked. Used to
 * seed the like button on review feeds without a per-row query.
 */
export async function getViewerLikedReviewIds(
  reviewIds: string[],
  viewerId: string,
): Promise<Set<string>> {
  if (reviewIds.length === 0) return new Set();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("likes")
    .select("review_id")
    .eq("user_id", viewerId)
    .in("review_id", reviewIds);
  if (error) throw error;
  return new Set(
    (data ?? []).map((row) => row.review_id).filter(Boolean) as string[],
  );
}

/**
 * Whether the viewer has liked a single collection — one indexed lookup on the
 * partial unique index.
 */
export async function getViewerLikedCollection(
  collectionId: string,
  viewerId: string,
): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", viewerId)
    .eq("collection_id", collectionId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

// Named `author` (not `actor`) so the shared `attachAvatars` helper, which keys
// on `author`, fills in the actor's avatar.
const NOTIF_ACTOR_EMBED =
  "author:profiles!notifications_actor_id_fkey(user_id, username, display_name)";

type RawNotification = {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  review_id: string | null;
  collection_id: string | null;
  comment_id: string | null;
  author: EmbeddedAuthor | null;
  review: { igdb_id: number } | null;
  collection: { id: string; name: string } | null;
};

/**
 * The viewer's most recent notifications plus the unread count. The link target
 * is resolved from whichever entity the notification carries: a collection
 * notification deep-links to the collection, anything tied to a review (incl.
 * comment likes/replies on a review's thread) links to that review's game.
 */
export async function getNotifications(
  viewerId: string,
): Promise<{ items: NotificationView[]; unread: number }> {
  const supabase = await createSupabaseServerClient();

  const [listRes, unreadRes] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        `id, type, created_at, read_at, review_id, collection_id, comment_id, ${NOTIF_ACTOR_EMBED}, review:reviews!notifications_review_id_fkey(igdb_id), collection:collections!notifications_collection_id_fkey(id, name)`,
      )
      .eq("recipient_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATIONS_LIMIT),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", viewerId)
      .is("read_at", null),
  ]);

  if (listRes.error) throw listRes.error;
  if (unreadRes.error) throw unreadRes.error;

  const rows = (listRes.data ?? []) as unknown as RawNotification[];
  const withAvatars = await attachAvatars(rows);

  const items: NotificationView[] = withAvatars.map((row) => {
    const href = row.collection
      ? `/collections/${row.collection.id}`
      : row.review
        ? `/games/${row.review.igdb_id}`
        : "#";
    return {
      id: row.id,
      type: row.type,
      created_at: row.created_at,
      read_at: row.read_at,
      actor: row.author,
      href,
      collection_name: row.collection?.name ?? null,
    };
  });

  return { items, unread: unreadRes.count ?? 0 };
}
