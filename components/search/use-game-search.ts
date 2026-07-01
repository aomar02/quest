"use client";

import { useEffect, useRef, useState } from "react";
import type { Tables } from "@/lib/supabase/types";

export type GameResult = Tables<"games">;

type SearchState = {
  results: GameResult[];
  isLoading: boolean;
  error: string | null;
};

// Tracks the resolved (success or error) outcome for a specific query string.
type Resolved = {
  forQuery: string;
  results: GameResult[];
  error: string | null;
};

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;

/**
 * Debounced game search against `/api/games/search`.
 *
 * - Waits {@link DEBOUNCE_MS} after the user stops typing before fetching.
 * - Aborts the in-flight request when the query changes or the component
 *   unmounts, so stale responses can never overwrite newer results.
 *
 * State is only written from the async callback; loading and the active result
 * set are derived from the current query vs. the last resolved query, so the
 * effect never calls setState synchronously.
 */
export function useGameSearch(query: string): SearchState {
  const [resolved, setResolved] = useState<Resolved>({
    forQuery: "",
    results: [],
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_LENGTH;

  useEffect(() => {
    // Cancel any request still in flight for the previous query.
    abortRef.current?.abort();

    if (trimmed.length < MIN_LENGTH) return;

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/games/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = (await res.json()) as { games: GameResult[] };
        setResolved({ forQuery: trimmed, results: data.games, error: null });
      } catch {
        if (controller.signal.aborted) return; // superseded — ignore
        setResolved({
          forQuery: trimmed,
          results: [],
          error: "تعذر البحث، حاول مرة أخرى.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Only surface results/errors that belong to the current query; anything
  // else means we're still waiting on a (debounced) fetch.
  const settled = !tooShort && resolved.forQuery === trimmed;

  return {
    results: settled ? resolved.results : [],
    error: settled ? resolved.error : null,
    isLoading: !tooShort && !settled,
  };
}
