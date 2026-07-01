/**
 * Game search with a persistent Postgres cache in front of the IGDB API.
 *
 * Cache-miss strategy:
 *   1. Check game_searches for the exact normalized query. Return immediately on hit.
 *   2. Run a local ILIKE search (for partial-query matches against already-cached games)
 *      and an IGDB call in parallel. Descriptions are NOT translated yet — they aren't
 *      shown in search results and translation (OpenAI) adds 2–5 s.
 *   3. Return merged results immediately (IGDB takes priority, local fills gaps).
 *   4. After the response is sent, translate descriptions and write to the cache so the
 *      next identical query is served from Postgres with full Arabic text.
 */
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/supabase/types";
import { searchGames, translateGameDescriptions } from "@/lib/igdb/client";
import type { NormalizedGame } from "@/lib/igdb/client";

export type Game = Tables<"games">;

const SEARCH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Fetch cached games by id and return them in the given order. Shared by the
 * search cache and the featured-games cache, so it takes a plain
 * SupabaseClient — callers may pass either the Clerk-bridged server client
 * or the service-role admin client.
 */
export async function getGamesByIds(
  supabase: SupabaseClient<Database>,
  ids: number[],
): Promise<Game[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .in("igdb_id", ids);

  if (error) throw error;

  const byId = new Map(data.map((game) => [game.igdb_id, game]));
  return ids
    .map((id) => byId.get(id))
    .filter((game): game is Game => game !== undefined);
}

/** Convert a NormalizedGame to the full Game row shape for immediate return. */
export function normalizedToGame(game: NormalizedGame): Game {
  const now = new Date().toISOString();
  return { ...game, cached_at: now, updated_at: now };
}

/**
 * Text search against already-cached games using ILIKE. Much faster than IGDB
 * and supports partial-word queries (e.g. "eld" finds "Elden Ring").
 */
async function searchGamesLocal(
  supabase: SupabaseClient<Database>,
  query: string,
): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .ilike("title", `%${query}%`)
    .order("rating_count", { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) {
    console.error("Local game search failed:", error);
    return [];
  }
  return data ?? [];
}

export async function searchGamesCached(rawQuery: string): Promise<Game[]> {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  const supabase = await createSupabaseServerClient();

  // 1. Try the cached search result.
  const { data: cached, error: cacheError } = await supabase
    .from("game_searches")
    .select("game_ids, fetched_at")
    .eq("query", query)
    .maybeSingle();

  if (cacheError) throw cacheError;

  const isFresh =
    cached &&
    Date.now() - new Date(cached.fetched_at).getTime() < SEARCH_TTL_MS;

  if (isFresh) {
    return getGamesByIds(supabase, cached.game_ids);
  }

  // 2. Cache miss / stale — run local text search and IGDB in parallel.
  //    Skip translation: descriptions aren't shown in the search UI and
  //    the OpenAI call adds 2–5 s of latency on every cold result.
  const [localResults, igdbGames] = await Promise.all([
    searchGamesLocal(supabase, query),
    searchGames(query, 20, { translate: false }),
  ]);

  // 3. Upsert games immediately without descriptions so existing Arabic
  //    translations in the DB are never overwritten by English text from IGDB.
  if (igdbGames.length > 0) {
    const withoutDescriptions = igdbGames.map((g) => ({ ...g, description: null }));
    const { error: upsertError } = await supabase.rpc("upsert_games", {
      _games: withoutDescriptions,
    });
    if (upsertError) throw upsertError;
  }

  // 4. Defer translation + cache-search entry until after the response is sent.
  //    Translation (OpenAI) takes 2–5 s and descriptions aren't shown in search,
  //    so we force-update descriptions to Arabic in the background.
  after(async () => {
    try {
      const bg = await createSupabaseServerClient();

      if (igdbGames.length > 0) {
        const translated = await translateGameDescriptions(igdbGames);
        const { error: translateUpsertError } = await bg.rpc(
          "update_game_descriptions",
          { _games: translated },
        );
        if (translateUpsertError) throw translateUpsertError;
      }

      const { error: searchError } = await bg.rpc("upsert_game_search", {
        _query: query,
        _game_ids: igdbGames.map((g) => g.igdb_id),
      });
      if (searchError) throw searchError;
    } catch (err) {
      console.error("Background search cache write failed:", err);
    }
  });

  // 4. Merge results: IGDB takes priority (ranked by relevance);
  //    local results supplement for partial-query hits not in IGDB response.
  const igdbIds = new Set(igdbGames.map((g) => g.igdb_id));
  const localSupplemental = localResults.filter((g) => !igdbIds.has(g.igdb_id));
  return [...igdbGames.map(normalizedToGame), ...localSupplemental];
}
