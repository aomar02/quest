import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { LibraryStatus } from "@/lib/user-games/shared";

/**
 * The viewer's saved status for a game (or null if they haven't added it). A
 * primary-key lookup on the unique (user_id, igdb_id) index, so it's cheap. The
 * stored value is narrowed to a `LibraryStatus`; legacy backlog/dropped rows
 * (not produced by the current UI) read back as null.
 */
export async function getViewerGameStatus(
  igdbId: number,
  viewerId: string,
): Promise<LibraryStatus | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_games")
    .select("status")
    .eq("igdb_id", igdbId)
    .eq("user_id", viewerId)
    .maybeSingle();

  if (error) throw error;

  const status = data?.status;
  return status === "playing" || status === "completed" || status === "wishlist"
    ? status
    : null;
}

/**
 * How many users have this game in their library as "playing" or "completed" —
 * the game page's "Total Played" stat. Wishlist entries are excluded since they
 * aren't actually being played. Count-only (`head`), so no rows are shipped.
 */
export async function getPlayedCountForGame(igdbId: number): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("user_games")
    .select("*", { count: "exact", head: true })
    .eq("igdb_id", igdbId)
    .in("status", ["playing", "completed"]);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Library status for a batch of users on one game, keyed by user_id — used to
 * show each reviewer's "Completed" / "Playing" / "Wishlist" badge next to their
 * review without an N+1 query per review.
 */
export async function getGameStatusesForUsers(
  igdbId: number,
  userIds: string[],
): Promise<Map<string, LibraryStatus>> {
  if (userIds.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_games")
    .select("user_id, status")
    .eq("igdb_id", igdbId)
    .in("user_id", userIds);

  if (error) throw error;

  const statuses = new Map<string, LibraryStatus>();
  for (const row of data ?? []) {
    if (
      row.status === "playing" ||
      row.status === "completed" ||
      row.status === "wishlist"
    ) {
      statuses.set(row.user_id, row.status);
    }
  }
  return statuses;
}
