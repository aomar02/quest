import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchGameScreenshots, imageUrl } from "@/lib/igdb/client";

export type Screenshot = {
  thumbnailUrl: string;
  fullUrl: string;
};

/**
 * Returns screenshot URLs for a game, serving from the Postgres cache when
 * available and falling back to a live IGDB fetch on first access.
 * An empty row is written when a game has no screenshots so we never hit
 * IGDB twice for the same game.
 */
export async function getGameScreenshots(
  igdbId: number,
): Promise<Screenshot[]> {
  const supabase = await createSupabaseServerClient();

  const { data: cached } = await supabase
    .from("game_screenshots")
    .select("image_ids")
    .eq("igdb_id", igdbId)
    .maybeSingle();

  const toScreenshots = (ids: string[]): Screenshot[] =>
    ids.map((id) => ({
      thumbnailUrl: imageUrl(id, "screenshot_med"),
      fullUrl: imageUrl(id, "1080p"),
    }));

  if (cached !== null) {
    return toScreenshots(cached.image_ids);
  }

  const ids = await fetchGameScreenshots(igdbId);

  await supabase
    .from("game_screenshots")
    .upsert({ igdb_id: igdbId, image_ids: ids });

  return toScreenshots(ids);
}
