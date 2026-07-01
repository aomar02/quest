import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRecentGames as fetchFromIgdb,
  translateGameDescriptions,
  type DiscoverFilters,
} from "@/lib/igdb/client";
import { normalizedToGame, type Game } from "@/lib/games/cache";

export type { DiscoverFilters, Game };

/**
 * Fetches recent releases from IGDB and caches them in Supabase in the
 * background so individual game pages can resolve them without a live IGDB
 * call.
 */
export async function getRecentGames(
  filters: DiscoverFilters = {},
): Promise<{ games: Game[]; hasMore: boolean }> {
  const { games: normalized, hasMore } = await fetchFromIgdb(filters);
  const games = normalized.map(normalizedToGame);

  // Upsert immediately without descriptions so existing Arabic translations in
  // the DB are never overwritten by English text from IGDB. For brand-new games
  // description stays null until the background translation job below runs.
  if (normalized.length > 0) {
    const supabase = createSupabaseAdminClient();
    const withoutDescriptions = normalized.map((g) => ({ ...g, description: null }));
    const { error } = await supabase.rpc("upsert_games", { _games: withoutDescriptions });
    if (error) console.error("Discover cache write failed:", error);
  }

  // Translate descriptions and force-update them after the response is sent.
  after(async () => {
    if (normalized.length === 0) return;
    const supabase = createSupabaseAdminClient();
    const translated = await translateGameDescriptions(normalized);
    const { error } = await supabase.rpc("update_game_descriptions", { _games: translated });
    if (error) console.error("Discover translation upsert failed:", error);
  });

  return { games, hasMore };
}
