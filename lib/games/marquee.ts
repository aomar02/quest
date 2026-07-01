/**
 * Decorative game-cover marquee shown on the sign-in/sign-up screens. Caches
 * the IGDB result in module memory for a while so visiting the auth pages
 * doesn't trigger an IGDB call on every request (same tradeoff as the OAuth
 * token cache in lib/igdb/client.ts).
 */
import { getRandomGameCovers, type GameCover } from "@/lib/igdb/client";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cached: { covers: GameCover[]; expiresAt: number } | null = null;
let pending: Promise<GameCover[]> | null = null;

export async function getMarqueeCovers(): Promise<GameCover[]> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.covers;
  }
  if (!pending) {
    pending = getRandomGameCovers()
      .then((covers) => {
        cached = { covers, expiresAt: Date.now() + CACHE_TTL_MS };
        return covers;
      })
      .catch((err) => {
        // Purely decorative — don't let an IGDB hiccup break the auth page.
        console.error("Failed to fetch marquee covers", err);
        return cached?.covers ?? [];
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
