"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameCard } from "@/components/games/game-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLATFORMS, GENRES, PERIODS } from "@/lib/discover-filters";
import type { PeriodValue } from "@/lib/discover-filters";
import type { Game } from "@/lib/games/cache";

type ActiveFilters = {
  platform?: number;
  genre?: number;
  period?: PeriodValue;
};

type Props = {
  initialGames: Game[];
  initialHasMore: boolean;
  activeFilters: ActiveFilters;
};

export function DiscoverGrid({ initialGames, initialHasMore, activeFilters }: Props) {
  const [extraGames, setExtraGames] = useState<Game[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [offset, setOffset] = useState(initialGames.length);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const allGames = [...initialGames, ...extraGames];

  async function loadMore() {
    setLoading(true);
    setError(null);

    const sp = buildParams(activeFilters);
    sp.set("offset", String(offset));

    try {
      const res = await fetch(`/api/games/discover?${sp}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "خطأ غير معروف");

      setExtraGames((prev) => [...prev, ...(data.games ?? [])]);
      setHasMore(data.hasMore ?? false);
      setOffset((prev) => prev + (data.games?.length ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر التحميل");
    } finally {
      setLoading(false);
    }
  }

  function setFilter(key: keyof ActiveFilters, value: number | PeriodValue | undefined) {
    const next: ActiveFilters = { ...activeFilters, [key]: value };
    router.push(`/discover?${buildParams(next)}`);
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated/40 p-4">
        <FilterRow label="المنصة">
          <FilterPill
            active={!activeFilters.platform}
            onClick={() => setFilter("platform", undefined)}
          >
            الكل
          </FilterPill>
          {PLATFORMS.map((p) => (
            <FilterPill
              key={p.id}
              active={activeFilters.platform === p.id}
              onClick={() =>
                setFilter("platform", activeFilters.platform === p.id ? undefined : p.id)
              }
            >
              {p.label}
            </FilterPill>
          ))}
        </FilterRow>

        <div className="h-px bg-border" />

        <FilterRow label="التصنيف">
          <FilterPill
            active={!activeFilters.genre}
            onClick={() => setFilter("genre", undefined)}
          >
            الكل
          </FilterPill>
          {GENRES.map((g) => (
            <FilterPill
              key={g.id}
              active={activeFilters.genre === g.id}
              onClick={() =>
                setFilter("genre", activeFilters.genre === g.id ? undefined : g.id)
              }
            >
              {g.label}
            </FilterPill>
          ))}
        </FilterRow>

        <div className="h-px bg-border" />

        <FilterRow label="الفترة">
          <FilterPill
            active={!activeFilters.period}
            onClick={() => setFilter("period", undefined)}
          >
            الكل
          </FilterPill>
          {PERIODS.map((p) => (
            <FilterPill
              key={p.value}
              active={activeFilters.period === p.value}
              onClick={() =>
                setFilter(
                  "period",
                  activeFilters.period === p.value ? undefined : p.value,
                )
              }
            >
              {p.label}
            </FilterPill>
          ))}
        </FilterRow>
      </div>

      {allGames.length === 0 ? (
        <p className="mt-16 text-center text-text-muted">
          لا توجد ألعاب بهذه المعايير.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-6">
          {allGames.map((game) => (
            <GameCard key={game.igdb_id} game={game} />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-4 text-center text-sm text-red-400">{error}</p>
      )}

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={loadMore}
            disabled={loading}
            className="min-w-40"
          >
            {loading ? "جاري التحميل…" : "تحميل المزيد"}
          </Button>
        </div>
      )}
    </>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="ml-1 min-w-[3.5rem] text-sm font-medium text-text-secondary">
        {label}:
      </span>
      {children}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors duration-200",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-bg-elevated text-text-secondary hover:bg-border hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function buildParams(filters: ActiveFilters): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.platform) sp.set("platform", String(filters.platform));
  if (filters.genre) sp.set("genre", String(filters.genre));
  if (filters.period) sp.set("period", filters.period);
  return sp;
}
