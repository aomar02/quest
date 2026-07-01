import { clerkClient } from "@clerk/nextjs/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/types";
import { getGamesByIds } from "@/lib/games/cache";

// Author info shown on admin list rows. Same shape as `CommentAuthor` /
// `ReviewAuthor` elsewhere, duplicated here rather than reused since this
// module's queries embed it under different FK names per table.
export type AdminAuthor = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export const PAGE_SIZE = 20;
// Generous cap for in-app aggregation (top games / most active users). The
// app is small enough that fetching ids and counting in JS is simpler and
// cheaper than a dedicated SQL aggregate function for an admin-only screen.
const STATS_SAMPLE_LIMIT = 5000;

function countBy<T, K>(rows: T[], keyFn: (row: T) => K): Map<K, number> {
  const map = new Map<K, number>();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

// PostgREST's `.or()` filter syntax uses `,()%` as control characters — strip
// them so a search box term can never break out of the filter string.
function sanitizeSearchTerm(input: string): string {
  return input.trim().replace(/[,()%]/g, "");
}

/** Batch-fills `avatar_url` (which lives on the Clerk user, not `profiles`) for rows that carry a `user_id`. */
async function withAvatars<T extends { user_id: string }>(
  rows: T[],
): Promise<(T & { avatar_url: string | null })[]> {
  const userIds = [...new Set(rows.map((row) => row.user_id))];
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
    avatar_url: avatarByUserId.get(row.user_id) ?? null,
  }));
}

type EmbeddedAuthor = Omit<AdminAuthor, "avatar_url">;

/** Same as {@link withAvatars} but for rows carrying a nested `author` embed. */
async function attachAuthorAvatars<T extends { author: EmbeddedAuthor | null }>(
  rows: T[],
): Promise<(Omit<T, "author"> & { author: AdminAuthor | null })[]> {
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

export type AdminStats = {
  counts: {
    users: number;
    collections: number;
    reviews: number;
    comments: number;
    likes: number;
  };
  newUsers: { last7Days: number; last30Days: number };
  topGames: (Tables<"games"> & { reviewCount: number })[];
  activeUsers: (AdminAuthor & { activityCount: number })[];
};

/**
 * Site-wide insights for the admin overview page: row counts, recent signup
 * volume, the games with the most reviews, and the most active users (by
 * combined reviews + collections + comments). Counts use `head: true` (cheap
 * regardless of table size); the rankings sample up to
 * {@link STATS_SAMPLE_LIMIT} rows and aggregate in JS rather than adding a
 * dedicated SQL function for a single admin-only screen.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createSupabaseAdminClient();
  const cutoff7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersRes,
    collectionsRes,
    reviewsRes,
    commentsRes,
    likesRes,
    new7Res,
    new30Res,
    reviewIgdbRes,
    reviewUsersRes,
    collectionUsersRes,
    commentUsersRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("collections").select("*", { count: "exact", head: true }),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase.from("comments").select("*", { count: "exact", head: true }),
    supabase.from("likes").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoff7),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoff30),
    supabase.from("reviews").select("igdb_id").limit(STATS_SAMPLE_LIMIT),
    supabase.from("reviews").select("user_id").limit(STATS_SAMPLE_LIMIT),
    supabase.from("collections").select("user_id").limit(STATS_SAMPLE_LIMIT),
    supabase.from("comments").select("user_id").limit(STATS_SAMPLE_LIMIT),
  ]);

  for (const res of [
    usersRes,
    collectionsRes,
    reviewsRes,
    commentsRes,
    likesRes,
    new7Res,
    new30Res,
    reviewIgdbRes,
    reviewUsersRes,
    collectionUsersRes,
    commentUsersRes,
  ]) {
    if (res.error) throw res.error;
  }

  const gameReviewCounts = countBy(reviewIgdbRes.data ?? [], (row) => row.igdb_id);
  const topGameIds = [...gameReviewCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const topGameRows = await getGamesByIds(supabase, topGameIds);
  const topGames = topGameRows.map((game) => ({
    ...game,
    reviewCount: gameReviewCounts.get(game.igdb_id) ?? 0,
  }));

  const activityByUser = new Map<string, number>();
  for (const rows of [reviewUsersRes.data, collectionUsersRes.data, commentUsersRes.data]) {
    for (const row of rows ?? []) {
      activityByUser.set(row.user_id, (activityByUser.get(row.user_id) ?? 0) + 1);
    }
  }
  const topUserIds = [...activityByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let activeUsers: AdminStats["activeUsers"] = [];
  if (topUserIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", topUserIds);
    if (profileError) throw profileError;

    const withAvatarRows = await withAvatars(profileRows ?? []);
    const byUserId = new Map(withAvatarRows.map((row) => [row.user_id, row]));
    activeUsers = topUserIds
      .map((id) => byUserId.get(id))
      .filter((row): row is (typeof withAvatarRows)[number] => row !== undefined)
      .map((row) => ({ ...row, activityCount: activityByUser.get(row.user_id) ?? 0 }));
  }

  return {
    counts: {
      users: usersRes.count ?? 0,
      collections: collectionsRes.count ?? 0,
      reviews: reviewsRes.count ?? 0,
      comments: commentsRes.count ?? 0,
      likes: likesRes.count ?? 0,
    },
    newUsers: { last7Days: new7Res.count ?? 0, last30Days: new30Res.count ?? 0 },
    topGames,
    activeUsers,
  };
}

export type AdminUserRow = Tables<"profiles"> & {
  avatar_url: string | null;
  reviewCount: number;
  collectionCount: number;
  commentCount: number;
};

/**
 * Paginated, searchable user list for the admin "users" page. Each row is
 * enriched with content counts via a fixed set of batched queries (never one
 * per user), same approach as `enrichCollections`.
 */
export async function searchUsers(
  { query = "", offset = 0 }: { query?: string; offset?: number } = {},
): Promise<{ users: AdminUserRow[]; hasMore: boolean }> {
  const supabase = createSupabaseAdminClient();
  const term = sanitizeSearchTerm(query);

  let builder = supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (term) {
    builder = builder.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  }

  // Ask for one extra row so we know whether there's a next page.
  const { data, error } = await builder.range(offset, offset + PAGE_SIZE);
  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  if (page.length === 0) return { users: [], hasMore: false };

  const userIds = page.map((row) => row.user_id);
  const [reviewsRes, collectionsRes, commentsRes] = await Promise.all([
    supabase.from("reviews").select("user_id").in("user_id", userIds),
    supabase.from("collections").select("user_id").in("user_id", userIds),
    supabase.from("comments").select("user_id").in("user_id", userIds),
  ]);
  if (reviewsRes.error) throw reviewsRes.error;
  if (collectionsRes.error) throw collectionsRes.error;
  if (commentsRes.error) throw commentsRes.error;

  const reviewCounts = countBy(reviewsRes.data ?? [], (row) => row.user_id);
  const collectionCounts = countBy(collectionsRes.data ?? [], (row) => row.user_id);
  const commentCounts = countBy(commentsRes.data ?? [], (row) => row.user_id);

  const withCounts = page.map((profile) => ({
    ...profile,
    reviewCount: reviewCounts.get(profile.user_id) ?? 0,
    collectionCount: collectionCounts.get(profile.user_id) ?? 0,
    commentCount: commentCounts.get(profile.user_id) ?? 0,
  }));

  return { users: await withAvatars(withCounts), hasMore };
}

const COLLECTION_AUTHOR_EMBED =
  "author:profiles!collections_user_id_profiles_fkey(user_id, username, display_name)";

type RawAdminCollectionRow = Tables<"collections"> & { author: EmbeddedAuthor | null };

export type AdminCollectionRow = Tables<"collections"> & {
  author: AdminAuthor | null;
  gameCount: number;
};

/** Paginated, searchable (by name) collection list for the admin "collections" page. */
export async function searchAdminCollections(
  { query = "", offset = 0 }: { query?: string; offset?: number } = {},
): Promise<{ collections: AdminCollectionRow[]; hasMore: boolean }> {
  const supabase = createSupabaseAdminClient();
  const term = sanitizeSearchTerm(query);

  let builder = supabase
    .from("collections")
    .select(`*, ${COLLECTION_AUTHOR_EMBED}`)
    .order("created_at", { ascending: false });
  if (term) builder = builder.ilike("name", `%${term}%`);

  const { data, error } = await builder.range(offset, offset + PAGE_SIZE);
  if (error) throw error;

  const rows = (data ?? []) as RawAdminCollectionRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);
  if (page.length === 0) return { collections: [], hasMore: false };

  const ids = page.map((row) => row.id);
  const { data: gameRows, error: gameError } = await supabase
    .from("collection_games")
    .select("collection_id")
    .in("collection_id", ids);
  if (gameError) throw gameError;
  const gameCounts = countBy(gameRows ?? [], (row) => row.collection_id);

  const withAuthors = await attachAuthorAvatars(page);
  return {
    collections: withAuthors.map((row) => ({
      ...row,
      gameCount: gameCounts.get(row.id) ?? 0,
    })),
    hasMore,
  };
}

const REVIEW_AUTHOR_EMBED =
  "author:profiles!reviews_user_id_profiles_fkey(user_id, username, display_name)";

type RawAdminReviewRow = Tables<"reviews"> & {
  author: EmbeddedAuthor | null;
  game: Tables<"games"> | null;
};

export type AdminReviewRow = Tables<"reviews"> & {
  author: AdminAuthor | null;
  game: Tables<"games"> | null;
};

/** Paginated, searchable (by review body) review list for the admin "reviews" page. */
export async function searchAdminReviews(
  { query = "", offset = 0 }: { query?: string; offset?: number } = {},
): Promise<{ reviews: AdminReviewRow[]; hasMore: boolean }> {
  const supabase = createSupabaseAdminClient();
  const term = sanitizeSearchTerm(query);

  let builder = supabase
    .from("reviews")
    .select(`*, ${REVIEW_AUTHOR_EMBED}, game:games(*)`)
    .order("created_at", { ascending: false });
  if (term) builder = builder.ilike("body", `%${term}%`);

  const { data, error } = await builder.range(offset, offset + PAGE_SIZE);
  if (error) throw error;

  const rows = (data ?? []) as RawAdminReviewRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);

  return { reviews: await attachAuthorAvatars(page), hasMore };
}

const COMMENT_AUTHOR_EMBED = "author:profiles!comments_user_id_fkey(user_id, username, display_name)";

type RawAdminCommentRow = Tables<"comments"> & {
  author: EmbeddedAuthor | null;
  review: { id: string; igdb_id: number } | null;
  collection: { id: string; name: string } | null;
};

export type AdminCommentRow = Tables<"comments"> & {
  author: AdminAuthor | null;
  review: { id: string; igdb_id: number } | null;
  collection: { id: string; name: string } | null;
};

/** Paginated, searchable (by body) comment list for the admin "comments" page, newest first. */
export async function searchAdminComments(
  { query = "", offset = 0 }: { query?: string; offset?: number } = {},
): Promise<{ comments: AdminCommentRow[]; hasMore: boolean }> {
  const supabase = createSupabaseAdminClient();
  const term = sanitizeSearchTerm(query);

  let builder = supabase
    .from("comments")
    .select(
      `*, ${COMMENT_AUTHOR_EMBED}, review:reviews!comments_review_id_fkey(id, igdb_id), collection:collections!comments_collection_id_fkey(id, name)`,
    )
    .order("created_at", { ascending: false });
  if (term) builder = builder.ilike("body", `%${term}%`);

  const { data, error } = await builder.range(offset, offset + PAGE_SIZE);
  if (error) throw error;

  const rows = (data ?? []) as RawAdminCommentRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const page = rows.slice(0, PAGE_SIZE);

  return { comments: await attachAuthorAvatars(page), hasMore };
}
