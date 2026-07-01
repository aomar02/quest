"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";

import { useGameSearch, type GameResult } from "./use-game-search";

function releaseYear(releaseDate: string | null): string | null {
  if (!releaseDate) return null;
  return releaseDate.slice(0, 4);
}

function GameRow({ game, onNavigate }: { game: GameResult; onNavigate: () => void }) {
  const year = releaseYear(game.release_date);

  return (
    <li>
      <Link
        href={`/games/${game.igdb_id}`}
        onClick={onNavigate}
        className="flex items-center gap-4 rounded-lg p-2 transition-colors hover:bg-bg-elevated"
      >
        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-bg-elevated">
          {game.cover_url && (
            <Image
              src={game.cover_url}
              alt={game.title}
              fill
              sizes="56px"
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary">
            {game.title}
            {year && (
              <span className="font-normal text-text-secondary"> ({year})</span>
            )}
          </p>
          {game.publisher && (
            <p className="truncate text-xs text-text-secondary">
              {game.publisher}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { results, isLoading, error } = useGameSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on Escape and lock background scroll while the overlay is open.
  useEffect(() => {
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const showEmpty =
    !isLoading && !error && query.trim().length >= 2 && results.length === 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="البحث عن لعبة"
      className="fixed inset-0 z-[100] flex flex-col bg-bg-primary/95 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-20 pb-8 sm:px-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Search className="size-5 shrink-0 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن لعبة..."
            className="w-full bg-transparent text-lg text-text-primary outline-none placeholder:text-text-muted"
          />
          {isLoading && (
            <Loader2 className="size-4 shrink-0 animate-spin text-text-secondary" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {error && <p className="px-2 py-4 text-sm text-destructive">{error}</p>}

          {showEmpty && (
            <p className="px-2 py-4 text-sm text-text-secondary">
              لا توجد نتائج مطابقة.
            </p>
          )}

          {results.length > 0 && (
            <ul className="flex flex-col gap-1">
              {results.map((game) => (
                <GameRow key={game.igdb_id} game={game} onNavigate={onClose} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function GameSearch() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="بحث"
        onClick={() => setOpen(true)}
        className="text-text-secondary transition-colors hover:text-text-primary"
      >
        <Search className="size-4" />
      </button>
      {open && <SearchOverlay onClose={() => setOpen(false)} />}
    </>
  );
}
