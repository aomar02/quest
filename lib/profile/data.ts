import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import {
  getProfileCollections,
  type CollectionCardData,
} from "@/lib/collections/data";

export type ReviewWithGame = Tables<"reviews"> & { games: Tables<"games"> };

// `added_at` is when the game was added to the user's library (user_games.created_at),
// kept alongside the game row so the "completed games" section can sort by it.
export type UserGame = Tables<"games"> & {
  added_at: string;
  status: "playing" | "completed" | "wishlist" | "backlog" | "dropped";
};

/** @deprecated Use UserGame */
export type CompletedGame = UserGame;

export type ProfileData = {
  profile: Tables<"profiles"> | null;
  userGames: UserGame[];
  reviews: ReviewWithGame[];
  ownedCollections: CollectionCardData[];
  bookmarkedCollections: CollectionCardData[];
};

/**
 * Loads everything a profile page renders for `profileUserId`. `viewerId` is
 * whoever is currently signed in — it only affects the bookmark/owner state
 * on the returned collections, so the same data works for both "my profile"
 * and "someone else's profile" pages.
 */
export async function getProfileData(
  profileUserId: string,
  viewerId: string,
): Promise<ProfileData> {
  const supabase = await createSupabaseServerClient();

  const [profileRes, completedRes, reviewsRes, collections] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", profileUserId).maybeSingle(),
    supabase
      .from("user_games")
      .select("games(*), created_at, status")
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("*, games(*)")
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false }),
    getProfileCollections(profileUserId, viewerId),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (completedRes.error) throw completedRes.error;
  if (reviewsRes.error) throw reviewsRes.error;

  const userGames: UserGame[] = (completedRes.data ?? [])
    .filter(
      (row): row is { games: Tables<"games">; created_at: string; status: UserGame["status"] } =>
        row.games !== null,
    )
    .map((row) => ({ ...row.games, added_at: row.created_at, status: row.status }));

  return {
    profile: profileRes.data,
    userGames,
    reviews: (reviewsRes.data ?? []) as ReviewWithGame[],
    ownedCollections: collections.owned,
    bookmarkedCollections: collections.bookmarked,
  };
}

/**
 * Resolves a username (case-insensitively, matching the unique
 * `lower(username)` index) to the Clerk user id behind it, for the public
 * profile route. Returns null when no profile has that username.
 */
export async function getUserIdByUsername(username: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .ilike("username", username)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}
