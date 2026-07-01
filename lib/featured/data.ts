/**
 * The homepage's top carousel: one "مكتبات مختارة" slide (a random
 * collection) and two "لعبة مختارة" slides (random games). Like
 * `lib/games/popular.ts`, reads never call an external API — they only
 * return whatever the scheduled job (see app/api/cron/featured) last stored
 * in `featured_collection` / `featured_games`. Both are refreshed every 24h.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getGamesByIds, type Game } from "@/lib/games/cache";
import { getRandomGames } from "@/lib/igdb/client";
import {
  enrichCollections,
  type CollectionCardData,
} from "@/lib/collections/data";

const FEATURED_GAMES_COUNT = 6;

export type FeaturedSlide =
  | { type: "collection"; collection: CollectionCardData }
  | { type: "game"; game: Game };

/**
 * Reads the cached featured collection + games and shapes them into the
 * carousel's slide order: collection first, then the two games. Slides whose
 * underlying row no longer exists (e.g. the featured collection was deleted)
 * are silently dropped rather than erroring.
 */
export async function getFeaturedCarousel(
  viewerId: string,
): Promise<FeaturedSlide[]> {
  const supabase = await createSupabaseServerClient();

  const [collectionCacheRes, gamesCacheRes] = await Promise.all([
    supabase
      .from("featured_collection")
      .select("collection_id")
      .eq("id", 1)
      .maybeSingle(),
    supabase.from("featured_games").select("game_ids").eq("id", 1).maybeSingle(),
  ]);

  if (collectionCacheRes.error) throw collectionCacheRes.error;
  if (gamesCacheRes.error) throw gamesCacheRes.error;

  const collectionId = collectionCacheRes.data?.collection_id ?? null;
  const gameIds = gamesCacheRes.data?.game_ids ?? [];

  const [collectionRow, games] = await Promise.all([
    collectionId
      ? supabase
          .from("collections")
          .select("*")
          .eq("id", collectionId)
          .maybeSingle()
          .then((res) => {
            if (res.error) throw res.error;
            return res.data;
          })
      : Promise.resolve(null),
    getGamesByIds(supabase, gameIds),
  ]);

  const slides: FeaturedSlide[] = [];

  if (collectionRow) {
    const [collection] = await enrichCollections([collectionRow], viewerId);
    if (collection) slides.push({ type: "collection", collection });
  }

  for (const game of games) {
    slides.push({ type: "game", game });
  }

  return slides;
}

/**
 * Refreshes the featured-carousel cache: picks a random collection from the
 * database and a random pair of games from IGDB. Runs with the service-role
 * client since the scheduled job has no Clerk session to bridge.
 */
export async function refreshFeatured(): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const [collectionIdsRes, games] = await Promise.all([
    supabase.from("collections").select("id"),
    getRandomGames(FEATURED_GAMES_COUNT),
  ]);

  if (collectionIdsRes.error) throw collectionIdsRes.error;

  const collectionIds = collectionIdsRes.data ?? [];
  const randomCollectionId =
    collectionIds.length > 0
      ? collectionIds[Math.floor(Math.random() * collectionIds.length)].id
      : null;

  if (games.length > 0) {
    const { error: upsertError } = await supabase.rpc("upsert_games", {
      _games: games,
    });
    if (upsertError) throw upsertError;
  }

  const [collectionUpsert, gamesUpsert] = await Promise.all([
    supabase.rpc("upsert_featured_collection", {
      _collection_id: randomCollectionId ?? undefined,
    }),
    supabase.rpc("upsert_featured_games", {
      _game_ids: games.map((game) => game.igdb_id),
    }),
  ]);

  if (collectionUpsert.error) throw collectionUpsert.error;
  if (gamesUpsert.error) throw gamesUpsert.error;
}
