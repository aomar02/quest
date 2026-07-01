import { clerkClient } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import { getViewerLikedReviewIds } from "@/lib/social/data";

// Just the author fields a review needs to render — never the whole profile row.
export type ReviewAuthor = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

// A review with its author, for the per-game review list. `viewer_liked` is
// whether the signed-in viewer has liked it (seeds the like button).
export type GameReview = Tables<"reviews"> & {
  author: ReviewAuthor | null;
  viewer_liked: boolean;
};

// A review with both its author and the reviewed game, for the homepage
// "recent reviews" rail where each card links to the game too.
export type RecentReview = Tables<"reviews"> & {
  author: ReviewAuthor | null;
  games: Tables<"games"> | null;
  viewer_liked: boolean;
};

// Author embed reused across review queries. Disambiguated by FK name because
// `reviews` references `profiles` exactly once, but naming it keeps the embed
// stable if more relationships are added later.
const AUTHOR_EMBED =
  "author:profiles!reviews_user_id_profiles_fkey(user_id, username, display_name)";

// Cap on reviews rendered on a game page. The total count (the stat) is exact
// regardless; this only limits how many bodies we ship.
const GAME_REVIEWS_LIMIT = 50;
const RECENT_REVIEWS_LIMIT = 8;

// Profile rows don't store an avatar — it lives on the Clerk user — so every
// review list needs a follow-up batch lookup to fill in `author.avatar_url`.
async function attachAvatarUrls<T extends { author: ReviewAuthor | null }>(
  rows: T[],
): Promise<T[]> {
  const userIds = [
    ...new Set(
      rows
        .map((row) => row.author?.user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (userIds.length === 0) return rows;

  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({
    userId: userIds,
    limit: userIds.length,
  });
  const avatarByUserId = new Map(users.map((user) => [user.id, user.imageUrl]));

  return rows.map((row) =>
    row.author
      ? {
          ...row,
          author: {
            ...row.author,
            avatar_url: avatarByUserId.get(row.author.user_id) ?? null,
          },
        }
      : row,
  );
}

/**
 * Reviews for a single game (newest first) plus the exact total — the "Total
 * Reviews" stat — in one round trip. PostgREST returns the full filtered count
 * even with a `limit`, so we never need a second count query.
 */
export async function getGameReviews(
  igdbId: number,
  viewerId: string,
): Promise<{ reviews: GameReview[]; count: number }> {
  const supabase = await createSupabaseServerClient();

  const { data, error, count } = await supabase
    .from("reviews")
    .select(`*, ${AUTHOR_EMBED}`, { count: "exact" })
    .eq("igdb_id", igdbId)
    .order("created_at", { ascending: false })
    .limit(GAME_REVIEWS_LIMIT);

  if (error) throw error;
  const rows = (data ?? []) as GameReview[];
  const liked = await getViewerLikedReviewIds(
    rows.map((review) => review.id),
    viewerId,
  );
  const reviews = await attachAvatarUrls(
    rows.map((review) => ({ ...review, viewer_liked: liked.has(review.id) })),
  );
  return { reviews, count: count ?? 0 };
}

/**
 * The viewer's own review of a game (or null), used to seed the rate modal and
 * decide whether the button reads "rate" or "edit". A primary-key lookup on the
 * unique (user_id, igdb_id) index, so it's essentially free.
 */
export async function getViewerReview(
  igdbId: number,
  viewerId: string,
): Promise<Tables<"reviews"> | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("igdb_id", igdbId)
    .eq("user_id", viewerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * The most recent reviews that have written text, across all users, for the
 * homepage "recent reviews" rail. Rating-only entries are skipped because the
 * rail is meant to surface something to read.
 */
export async function getRecentReviews(
  viewerId: string,
): Promise<RecentReview[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("reviews")
    .select(`*, ${AUTHOR_EMBED}, games(*)`)
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(RECENT_REVIEWS_LIMIT);

  if (error) throw error;
  const rows = (data ?? []) as RecentReview[];
  const liked = await getViewerLikedReviewIds(
    rows.map((review) => review.id),
    viewerId,
  );
  return attachAvatarUrls(
    rows.map((review) => ({ ...review, viewer_liked: liked.has(review.id) })),
  );
}
