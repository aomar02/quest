"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

import type { CollectionCardData } from "@/lib/collections/data";
import { CollectionCard } from "./collection-card";

const DEBOUNCE_MS = 300;

type SearchResponse = {
  collections: CollectionCardData[];
  hasMore: boolean;
  error?: string;
};

// Tracks the resolved (success or error) outcome for a specific query string,
// mirroring useGameSearch's pattern so state is only ever written from the
// async callback — never synchronously inside the effect body.
type Resolved = {
  forQuery: string;
  collections: CollectionCardData[];
  hasMore: boolean;
  error: string | null;
};

/**
 * Browses every public collection, most-recent-first, with a search box that
 * matches by collection name or by a game it contains. Searching and "load
 * more" both hit `/api/collections/search`, which runs a single indexed
 * Postgres query rather than filtering in JS — so typing stays cheap even as
 * the number of collections grows.
 *
 * An empty query always shows the server-rendered initial list directly,
 * without a round trip.
 */
export function LibraryBrowser({
  initialCollections,
  initialHasMore,
}: {
  initialCollections: CollectionCardData[];
  initialHasMore: boolean;
}) {
  const initialResolved: Resolved = {
    forQuery: "",
    collections: initialCollections,
    hasMore: initialHasMore,
    error: null,
  };

  const [query, setQuery] = useState("");
  const [resolved, setResolved] = useState<Resolved>(initialResolved);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const trimmed = query.trim();
  const settled = resolved.forQuery === trimmed;
  const isSearching = trimmed !== "" && !settled;
  const collections = settled ? resolved.collections : [];
  const hasMore = settled ? resolved.hasMore : false;
  const error = settled ? resolved.error : null;

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim() === "") {
      // Clearing the box just restores the initial list — no fetch needed.
      abortRef.current?.abort();
      setResolved(initialResolved);
    }
  };

  useEffect(() => {
    abortRef.current?.abort();

    if (trimmed === "") return; // handled synchronously in onQueryChange

    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/collections/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as SearchResponse;
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setResolved({
          forQuery: trimmed,
          collections: data.collections,
          hasMore: data.hasMore,
          error: null,
        });
      } catch {
        if (controller.signal.aborted) return; // superseded — ignore
        setResolved({
          forQuery: trimmed,
          collections: [],
          hasMore: false,
          error: "تعذر البحث، حاول مرة أخرى.",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const onLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/collections/search?q=${encodeURIComponent(trimmed)}&offset=${collections.length}`,
      );
      const data = (await res.json()) as SearchResponse;
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResolved({
        forQuery: trimmed,
        collections: [...collections, ...data.collections],
        hasMore: data.hasMore,
        error: null,
      });
    } catch {
      setResolved((prev) => ({ ...prev, error: "تعذر تحميل المزيد، حاول مرة أخرى." }));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3">
        <Search className="size-4 shrink-0 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="ابحث بعنوان المجموعة أو اسم لعبة..."
          className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        />
        {isSearching && (
          <Loader2 className="size-4 shrink-0 animate-spin text-text-secondary" />
        )}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {!error && collections.length === 0 && !isSearching && (
        <p className="mt-10 text-text-muted">لا توجد مجموعات مطابقة.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary disabled:opacity-60"
          >
            {isLoadingMore && <Loader2 className="size-4 animate-spin" />}
            تحميل المزيد
          </button>
        </div>
      )}
    </div>
  );
}
