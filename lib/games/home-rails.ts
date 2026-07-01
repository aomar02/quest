import { after } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getUpcomingGames as fetchUpcoming,
  type NormalizedGame,
} from "@/lib/igdb/client";
import { normalizedToGame, type Game } from "@/lib/games/cache";

export type { Game };

async function igdbRailWithCache(
  fetcher: () => Promise<NormalizedGame[]>,
): Promise<Game[]> {
  const normalized = await fetcher();
  const games = normalized.map(normalizedToGame);

  if (normalized.length > 0) {
    after(async () => {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.rpc("upsert_games", { _games: normalized });
      if (error) console.error("Home rail cache write failed:", error);
    });
  }

  return games;
}

export async function getUpcomingGames(): Promise<Game[]> {
  return igdbRailWithCache(() => fetchUpcoming(6));
}
