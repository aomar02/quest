/**
 * Server-only IGDB API client.
 *
 * IGDB is authenticated through Twitch: we exchange the app's client id/secret
 * for an OAuth app access token (valid ~60 days), then send it on every request
 * alongside the Client-ID header. The token is cached in module memory and
 * refreshed only when it is missing or about to expire, so we don't mint a new
 * one per request.
 *
 * This file must never be imported from a Client Component — it reads the IGDB
 * secret from the environment and is meant to run only on the server (it is
 * imported solely by the games cache layer / route handler).
 */

import { translateDescriptionsToArabic } from "@/lib/translate/description";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_URL = "https://api.igdb.com/v4";

// IGDB image CDN. The id is an opaque `image_id`; the `t_*` segment selects a
// rendered size. See https://api-docs.igdb.com/#images
const IMAGE_BASE = "https://images.igdb.com/igdb/image/upload";

type TwitchToken = {
  accessToken: string;
  /** Epoch ms after which the token should be considered expired. */
  expiresAt: number;
};

let cachedToken: TwitchToken | null = null;
// De-duplicates concurrent token refreshes so a burst of requests triggers a
// single Twitch round-trip rather than one per request.
let pendingToken: Promise<TwitchToken> | null = null;

async function fetchToken(): Promise<TwitchToken> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("IGDB_CLIENT_ID / IGDB_CLIENT_SECRET are not set");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${TOKEN_URL}?${params}`, {
    method: "POST",
    // The token is long-lived; let Next cache it briefly to absorb cold-start
    // bursts, but our in-memory cache is the primary guard.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Twitch token request failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    // Refresh a minute early to avoid using a token that expires mid-request.
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }
  if (!pendingToken) {
    pendingToken = fetchToken()
      .then((token) => {
        cachedToken = token;
        return token;
      })
      .finally(() => {
        pendingToken = null;
      });
  }
  return (await pendingToken).accessToken;
}

export function imageUrl(
  imageId: string,
  size: string,
  extension: "jpg" | "png" = "jpg",
): string {
  return `${IMAGE_BASE}/t_${size}/${imageId}.${extension}`;
}

/** Shape of the IGDB `/games` response fields we request. */
type IgdbGameResponse = {
  id: number;
  name?: string;
  summary?: string;
  first_release_date?: number; // unix seconds
  total_rating?: number; // 0-100
  total_rating_count?: number;
  cover?: { image_id?: string };
  artworks?: { image_id?: string }[];
  screenshots?: { image_id?: string }[];
  platforms?: { name?: string; abbreviation?: string }[];
  themes?: { name?: string }[];
  involved_companies?: {
    publisher?: boolean;
    company?: { name?: string };
  }[];
};

/** Normalized game ready to be upserted into the `games` cache table. */
export type NormalizedGame = {
  igdb_id: number;
  title: string;
  cover_url: string | null;
  banner_url: string | null;
  release_date: string | null; // YYYY-MM-DD
  publisher: string | null;
  platforms: string[];
  genres: string[];
  description: string | null;
  rating: number | null;
  rating_count: number | null;
};

function normalize(game: IgdbGameResponse): NormalizedGame | null {
  // "Ignore any entry that is not in the api": skip results that lack the core
  // fields we need to render a meaningful row (a title and a cover).
  if (!game.name || !game.cover?.image_id) return null;

  const banner =
    game.artworks?.find((a) => a.image_id)?.image_id ??
    game.screenshots?.find((s) => s.image_id)?.image_id ??
    null;

  const publisher =
    game.involved_companies?.find((c) => c.publisher && c.company?.name)
      ?.company?.name ?? null;

  const platforms =
    game.platforms
      ?.map((p) => p.abbreviation || p.name)
      .filter((p): p is string => Boolean(p)) ?? [];

  const genres =
    game.themes
      ?.map((t) => t.name)
      .filter((t): t is string => Boolean(t)) ?? [];

  const releaseDate = game.first_release_date
    ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
    : null;

  return {
    igdb_id: game.id,
    title: game.name,
    cover_url: imageUrl(game.cover.image_id, "cover_big"),
    banner_url: banner ? imageUrl(banner, "1080p") : null,
    release_date: releaseDate,
    publisher,
    platforms,
    genres,
    description: game.summary ?? null,
    rating: game.total_rating != null ? Math.round(game.total_rating) : null,
    rating_count: game.total_rating_count ?? null,
  };
}

/**
 * Replaces each game's English `description` with an Arabic translation, so
 * only Arabic text ever reaches the `games` cache table. Games without a
 * description are left untouched.
 */
export async function translateGameDescriptions(
  games: NormalizedGame[],
): Promise<NormalizedGame[]> {
  const indices: number[] = [];
  const originals: string[] = [];
  games.forEach((game, i) => {
    if (game.description) {
      indices.push(i);
      originals.push(game.description);
    }
  });

  if (originals.length === 0) return games;

  const translated = await translateDescriptionsToArabic(originals);

  const result = [...games];
  indices.forEach((gameIndex, i) => {
    result[gameIndex] = { ...result[gameIndex], description: translated[i] };
  });
  return result;
}

// Field set normalize() depends on — shared by every /games query so the two
// stay in sync.
const GAME_FIELDS = [
  "fields name, summary, first_release_date, total_rating, total_rating_count,",
  "  cover.image_id, artworks.image_id, screenshots.image_id,",
  "  platforms.name, platforms.abbreviation,",
  "  themes.name,",
  "  involved_companies.publisher, involved_companies.company.name;",
].join("\n");

async function igdbRequest<T>(endpoint: string, body: string): Promise<T> {
  const token = await getAccessToken();
  const clientId = process.env.IGDB_CLIENT_ID!;

  const res = await fetch(`${IGDB_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`IGDB ${endpoint} request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Search IGDB for games matching `query`, returning normalized records.
 * Uses the Apicalypse query language over the `/games` endpoint.
 */
export async function searchGames(
  query: string,
  limit = 20,
  { translate = true }: { translate?: boolean } = {},
): Promise<NormalizedGame[]> {
  const body = [
    `search "${query.replace(/"/g, '\\"')}";`,
    GAME_FIELDS,
    // Main games only (game_type 0 — `category` is deprecated), excluding
    // edition/port duplicates.
    "where version_parent = null & game_type = 0;",
    `limit ${limit};`,
  ].join("\n");

  const games = await igdbRequest<IgdbGameResponse[]>("games", body);
  const normalized = games
    .map(normalize)
    .filter((g): g is NormalizedGame => g !== null);
  return translate ? translateGameDescriptions(normalized) : normalized;
}

/** A single cover image, stripped down for decorative use (e.g. a marquee). */
export type GameCover = {
  igdbId: number;
  title: string;
  coverUrl: string;
};

/**
 * Fetches a random sample of well-known game covers for decorative use (the
 * sign-in/sign-up marquee). IGDB's Apicalypse query language has no native
 * random sort, so this pulls a larger pool of well-rated main games and
 * shuffles it in memory instead.
 */
export async function getRandomGameCovers(limit = 24): Promise<GameCover[]> {
  const poolSize = 200;
  const body = [
    "fields name, cover.image_id;",
    "where cover != null & total_rating_count > 50 & version_parent = null & game_type = 0;",
    "sort total_rating_count desc;",
    `limit ${poolSize};`,
  ].join("\n");

  const games = await igdbRequest<
    { id: number; name?: string; cover?: { image_id?: string } }[]
  >("games", body);

  const covers = games
    .filter(
      (g): g is { id: number; name: string; cover: { image_id: string } } =>
        Boolean(g.name && g.cover?.image_id),
    )
    .map((g) => ({
      igdbId: g.id,
      title: g.name,
      coverUrl: imageUrl(g.cover.image_id, "cover_big"),
    }));

  for (let i = covers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [covers[i], covers[j]] = [covers[j], covers[i]];
  }

  return covers.slice(0, limit);
}

/** Games released in the last 90 days, newest first. */
export async function getRecentlyReleasedGames(
  limit = 6,
): Promise<NormalizedGame[]> {
  const now = Math.floor(Date.now() / 1000);
  const ninetyDaysAgo = now - 90 * 24 * 3600;

  const body = [
    GAME_FIELDS,
    `where version_parent = null & game_type = 0 & cover != null`,
    `  & first_release_date <= ${now} & first_release_date >= ${ninetyDaysAgo};`,
    "sort first_release_date desc;",
    `limit ${limit};`,
  ].join("\n");

  const games = await igdbRequest<IgdbGameResponse[]>("games", body);
  return games.map(normalize).filter((g): g is NormalizedGame => g !== null);
}

/** Announced games with a future release date, soonest first. */
export async function getUpcomingGames(limit = 6): Promise<NormalizedGame[]> {
  const now = Math.floor(Date.now() / 1000);

  const body = [
    GAME_FIELDS,
    `where version_parent = null & game_type = 0 & cover != null & first_release_date > ${now};`,
    "sort first_release_date asc;",
    `limit ${limit};`,
  ].join("\n");

  const games = await igdbRequest<IgdbGameResponse[]>("games", body);
  return games.map(normalize).filter((g): g is NormalizedGame => g !== null);
}

/** Highest-rated games (minimum 20 ratings), sorted by total_rating desc. */
export async function getTopRatedGames(limit = 6): Promise<NormalizedGame[]> {
  const body = [
    GAME_FIELDS,
    "where version_parent = null & game_type = 0 & cover != null & total_rating_count > 20;",
    "sort total_rating desc;",
    `limit ${limit};`,
  ].join("\n");

  const games = await igdbRequest<IgdbGameResponse[]>("games", body);
  return games.map(normalize).filter((g): g is NormalizedGame => g !== null);
}

/**
 * Fetches a random sample of well-known games, fully normalized (cover,
 * banner, rating, etc.) for decorative use (the homepage's "لعبة مختارة"
 * carousel slide). Same pool-then-shuffle approach as `getRandomGameCovers`,
 * since IGDB's Apicalypse has no native random sort.
 */
export async function getRandomGames(limit = 2): Promise<NormalizedGame[]> {
  const poolSize = 200;
  const body = [
    GAME_FIELDS,
    "where cover != null & total_rating_count > 50 & version_parent = null & game_type = 0;",
    "sort total_rating_count desc;",
    `limit ${poolSize};`,
  ].join("\n");

  const games = await igdbRequest<IgdbGameResponse[]>("games", body);
  const normalized = games
    .map(normalize)
    .filter((g): g is NormalizedGame => g !== null);

  for (let i = normalized.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [normalized[i], normalized[j]] = [normalized[j], normalized[i]];
  }

  // Translate only the selected subset — the pool can be up to 200 games but
  // only `limit` of them are ever returned/cached.
  return translateGameDescriptions(normalized.slice(0, limit));
}

export type DiscoverFilters = {
  platform?: number;
  genre?: number;
  period?: "year" | "3y" | "5y";
  offset?: number;
  limit?: number;
};

/**
 * Fetches recent game releases from IGDB, sorted newest-first, with optional
 * platform, genre, and time-period filters. Used by the discover page.
 *
 * Fetches `limit + 1` results so the caller can detect whether more pages exist.
 * Descriptions are NOT translated — they aren't shown on the discover grid.
 */
export async function getRecentGames(
  filters: DiscoverFilters = {},
): Promise<{ games: NormalizedGame[]; hasMore: boolean }> {
  const { platform, genre, period, offset = 0, limit = 18 } = filters;

  const now = Math.floor(Date.now() / 1000);

  const where: string[] = [
    "version_parent = null",
    "game_type = 0",
    "cover != null",
    `first_release_date <= ${now}`,
  ];

  if (period === "year") {
    const jan1 = Math.floor(
      new Date(`${new Date().getUTCFullYear()}-01-01T00:00:00Z`).getTime() / 1000,
    );
    where.push(`first_release_date >= ${jan1}`);
  } else if (period === "3y") {
    where.push(`first_release_date >= ${now - 3 * 365 * 24 * 3600}`);
  } else if (period === "5y") {
    where.push(`first_release_date >= ${now - 5 * 365 * 24 * 3600}`);
  }

  if (platform) where.push(`platforms = (${platform})`);
  if (genre) where.push(`genres = (${genre})`);

  const body = [
    GAME_FIELDS,
    `where ${where.join(" & ")};`,
    "sort first_release_date desc;",
    `limit ${limit + 1};`,
    `offset ${offset};`,
  ].join("\n");

  const raw = await igdbRequest<IgdbGameResponse[]>("games", body);
  const hasMore = raw.length > limit;
  const games = raw
    .slice(0, limit)
    .map(normalize)
    .filter((g): g is NormalizedGame => g !== null);

  return { games, hasMore };
}

/**
 * Fetches the English description (summary) for a single game from IGDB.
 * Used to backfill descriptions for games cached before translation was added.
 */
export async function fetchGameDescriptionById(
  igdbId: number,
): Promise<string | null> {
  const games = await igdbRequest<{ id: number; summary?: string }[]>(
    "games",
    ["fields summary;", `where id = ${igdbId};`, "limit 1;"].join("\n"),
  );
  return games[0]?.summary ?? null;
}

/**
 * Fetches screenshot image_ids for a single game directly from IGDB.
 * Returns an empty array when the game has no screenshots.
 * Callers are responsible for caching — this always hits the IGDB API.
 */
export async function fetchGameScreenshots(igdbId: number): Promise<string[]> {
  const screenshots = await igdbRequest<{ image_id?: string }[]>(
    "screenshots",
    [
      "fields image_id;",
      `where game = ${igdbId};`,
      "limit 20;",
    ].join("\n"),
  );
  return screenshots
    .map((s) => s.image_id)
    .filter((id): id is string => Boolean(id));
}

/**
 * Resolves IGDB `platform_logo` images for a list of platform names or
 * abbreviations (as stored on a cached `games` row). Not cached — the
 * `games` table only stores plain platform strings, not logo image ids, so
 * this is looked up against IGDB directly on each game page render.
 *
 * Returns a map keyed by both the platform's name and abbreviation so
 * callers can look up by whichever string they have on hand.
 */
export async function getPlatformLogos(
  platformNames: string[],
): Promise<Map<string, string>> {
  const logos = new Map<string, string>();
  if (platformNames.length === 0) return logos;

  const values = platformNames
    .map((name) => `"${name.replace(/"/g, '\\"')}"`)
    .join(",");

  const platforms = await igdbRequest<
    {
      name: string;
      abbreviation?: string;
      platform_logo?: { image_id?: string };
    }[]
  >(
    "platforms",
    [
      "fields name, abbreviation, platform_logo.image_id;",
      `where (abbreviation = (${values}) | name = (${values})) & platform_logo != null;`,
      `limit ${platformNames.length};`,
    ].join("\n"),
  );

  for (const platform of platforms) {
    const imageId = platform.platform_logo?.image_id;
    if (!imageId) continue;
    const url = imageUrl(imageId, "logo_med", "png");
    if (platform.abbreviation) logos.set(platform.abbreviation, url);
    logos.set(platform.name, url);
  }

  return logos;
}
