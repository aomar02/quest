import { getRecentGames } from "@/lib/games/discover";
import { DiscoverGrid } from "@/components/games/discover-grid";
import type { PeriodValue } from "@/lib/discover-filters";

const VALID_PERIODS = new Set<PeriodValue>(["year", "3y", "5y"]);
const PAGE_SIZE = 18;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    platform?: string;
    genre?: string;
    period?: string;
  }>;
}) {
  const params = await searchParams;

  const platform = params.platform ? Number(params.platform) : undefined;
  const genre = params.genre ? Number(params.genre) : undefined;
  const rawPeriod = params.period;
  const period =
    rawPeriod && VALID_PERIODS.has(rawPeriod as PeriodValue)
      ? (rawPeriod as PeriodValue)
      : undefined;

  const { games, hasMore } = await getRecentGames({
    platform,
    genre,
    period,
    limit: PAGE_SIZE,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-baseline gap-3">
        <h1 className="text-3xl font-bold text-text-primary">اكتشف</h1>
        <p className="text-text-muted">أحدث الإصدارات</p>
      </div>

      <DiscoverGrid
        key={`${platform}-${genre}-${period}`}
        initialGames={games}
        initialHasMore={hasMore}
        activeFilters={{ platform, genre, period }}
      />
    </div>
  );
}
