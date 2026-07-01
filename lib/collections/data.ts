import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";
import type { Game } from "@/lib/games/cache";
import { getViewerLikedCollection } from "@/lib/social/data";

// Author info shown on a collection card / detail header. Only the fields the
// UI renders are selected — never the whole profile row.
export type CollectionAuthor = {
  user_id: string;
  username: string;
  display_name: string;
};

// Lightweight shape for a collection card: enough to render the card without
// loading every game in the collection (only a 4-cover preview).
export type CollectionCardData = Tables<"collections"> & {
  previewGames: Game[];
  gameCount: number;
  author: CollectionAuthor | null;
  isOwner: boolean;
  isBookmarked: boolean;
  isLiked: boolean;
};

// Full collection for the detail page: every game, plus social metadata.
export type CollectionDetail = Tables<"collections"> & {
  games: Game[];
  author: CollectionAuthor | null;
  isOwner: boolean;
  isBookmarked: boolean;
  isLiked: boolean;
  bookmarkCount: number;
};

const PREVIEW_COUNT = 4;

/**
 * Enriches a list of already-fetched collection rows with the data their cards
 * need (preview covers, game count, author, viewer's bookmark state) using a
 * fixed set of batched queries — never one query per collection — so rendering
 * a grid of collections stays cheap.
 */
export async function enrichCollections(
  collections: Tables<"collections">[],
  viewerId: string,
): Promise<CollectionCardData[]> {
  if (collections.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const ids = collections.map((collection) => collection.id);
  const userIds = [...new Set(collections.map((collection) => collection.user_id))];

  const [gamesRes, authorsRes, bookmarksRes, likesRes] = await Promise.all([
    supabase
      .from("collection_games")
      .select("collection_id, games(*)")
      .in("collection_id", ids)
      .order("added_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", userIds),
    supabase
      .from("collection_bookmarks")
      .select("collection_id")
      .eq("user_id", viewerId)
      .in("collection_id", ids),
    supabase
      .from("likes")
      .select("collection_id")
      .eq("user_id", viewerId)
      .in("collection_id", ids),
  ]);

  if (gamesRes.error) throw gamesRes.error;
  if (authorsRes.error) throw authorsRes.error;
  if (bookmarksRes.error) throw bookmarksRes.error;
  if (likesRes.error) throw likesRes.error;

  const previewByCollection = new Map<string, Game[]>();
  const countByCollection = new Map<string, number>();
  for (const row of gamesRes.data ?? []) {
    if (!row.games) continue;
    countByCollection.set(
      row.collection_id,
      (countByCollection.get(row.collection_id) ?? 0) + 1,
    );
    const preview = previewByCollection.get(row.collection_id) ?? [];
    if (preview.length < PREVIEW_COUNT) {
      preview.push(row.games);
      previewByCollection.set(row.collection_id, preview);
    }
  }

  const authorByUser = new Map(
    (authorsRes.data ?? []).map((author) => [author.user_id, author]),
  );
  const bookmarkedIds = new Set(
    (bookmarksRes.data ?? []).map((row) => row.collection_id),
  );
  const likedIds = new Set(
    (likesRes.data ?? []).map((row) => row.collection_id).filter(Boolean),
  );

  return collections.map((collection) => ({
    ...collection,
    previewGames: previewByCollection.get(collection.id) ?? [],
    gameCount: countByCollection.get(collection.id) ?? 0,
    author: authorByUser.get(collection.user_id) ?? null,
    isOwner: collection.user_id === viewerId,
    isBookmarked: bookmarkedIds.has(collection.id),
    isLiked: likedIds.has(collection.id),
  }));
}

/**
 * Counts how many collections (across all users) a game appears in — the
 * "Total Collection" stat on the game page. A single count query, not a
 * row fetch, so it stays cheap regardless of how many collections exist.
 */
export async function getCollectionCountForGame(igdbId: number): Promise<number> {
  const supabase = await createSupabaseServerClient();

  const { count, error } = await supabase
    .from("collection_games")
    .select("*", { count: "exact", head: true })
    .eq("igdb_id", igdbId);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Loads a single collection (any user's) for its detail page. Returns null when
 * the collection doesn't exist so the caller can render notFound().
 */
export async function getCollection(
  id: string,
  viewerId: string,
): Promise<CollectionDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: collection, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!collection) return null;

  const [gamesRes, authorRes, bookmarkRes, countRes, isLiked] =
    await Promise.all([
      supabase
        .from("collection_games")
        .select("games(*)")
        .eq("collection_id", id)
        .order("added_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .eq("user_id", collection.user_id)
        .maybeSingle(),
      supabase
        .from("collection_bookmarks")
        .select("collection_id")
        .eq("user_id", viewerId)
        .eq("collection_id", id)
        .maybeSingle(),
      supabase
        .from("collection_bookmarks")
        .select("*", { count: "exact", head: true })
        .eq("collection_id", id),
      getViewerLikedCollection(id, viewerId),
    ]);

  if (gamesRes.error) throw gamesRes.error;
  if (authorRes.error) throw authorRes.error;
  if (bookmarkRes.error) throw bookmarkRes.error;
  if (countRes.error) throw countRes.error;

  const games = (gamesRes.data ?? [])
    .map((row) => row.games)
    .filter((game): game is Game => game !== null);

  return {
    ...collection,
    games,
    author: authorRes.data,
    isOwner: collection.user_id === viewerId,
    isBookmarked: bookmarkRes.data !== null,
    isLiked,
    bookmarkCount: countRes.count ?? 0,
  };
}

const LIBRARY_PAGE_SIZE = 24;

/**
 * Searches all collections (any user's) by name or by a game title they
 * contain, ordered most-recent-first. Backed by the `search_collections` SQL
 * function so matching happens in a single indexed round trip (trigram
 * indexes on `collections.name` / `games.title`) instead of fetching rows to
 * filter in application code. Pass an empty query to just browse everything.
 */
export async function searchCollections(
  viewerId: string,
  { query = "", offset = 0 }: { query?: string; offset?: number } = {},
): Promise<{ collections: CollectionCardData[]; hasMore: boolean }> {
  const supabase = await createSupabaseServerClient();

  // Ask for one extra row so we know whether there's a next page without a
  // separate count query.
  const trimmed = query.trim();
  const { data, error } = await supabase.rpc("search_collections", {
    ...(trimmed && { search_term: trimmed }),
    result_limit: LIBRARY_PAGE_SIZE + 1,
    result_offset: offset,
  });

  if (error) throw error;

  const rows = data ?? [];
  const hasMore = rows.length > LIBRARY_PAGE_SIZE;

  return {
    collections: await enrichCollections(rows.slice(0, LIBRARY_PAGE_SIZE), viewerId),
    hasMore,
  };
}

const RECENT_COLLECTIONS_COUNT = 6;

/**
 * The most recently created collections across all users, for the homepage's
 * "اخر المكتبات" rail. A simple limit query rather than `searchCollections` —
 * no pagination or text search needed for a fixed-size preview.
 */
export async function getRecentCollections(
  viewerId: string,
): Promise<CollectionCardData[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(RECENT_COLLECTIONS_COUNT);

  if (error) throw error;

  return enrichCollections(data ?? [], viewerId);
}

/**
 * The collections shown on a profile page: the ones its owner created plus
 * the ones they've bookmarked (which may belong to other users). `viewerId`
 * is whoever is looking at the page right now — used only to compute each
 * card's `isOwner`/`isBookmarked` state, which differs from the profile
 * owner's when you're viewing someone else's profile.
 */
export async function getProfileCollections(
  profileUserId: string,
  viewerId: string,
): Promise<{
  owned: CollectionCardData[];
  bookmarked: CollectionCardData[];
}> {
  const supabase = await createSupabaseServerClient();

  const [ownedRes, bookmarkRes] = await Promise.all([
    supabase
      .from("collections")
      .select("*")
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false }),
    supabase
      .from("collection_bookmarks")
      .select("collection_id, created_at, collections(*)")
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false }),
  ]);

  if (ownedRes.error) throw ownedRes.error;
  if (bookmarkRes.error) throw bookmarkRes.error;

  const bookmarkedRows = (bookmarkRes.data ?? [])
    .map((row) => row.collections)
    .filter((collection): collection is Tables<"collections"> => collection !== null);

  const [owned, bookmarked] = await Promise.all([
    enrichCollections(ownedRes.data ?? [], viewerId),
    enrichCollections(bookmarkedRows, viewerId),
  ]);

  return { owned, bookmarked };
}
