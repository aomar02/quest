"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";

import { GameCard } from "@/components/games/game-card";
import { ExpandableSection } from "@/components/profile/expandable-section";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserGame } from "@/lib/profile/data";

type SortKey = "added" | "rating";
type StatusFilter = "all" | "completed" | "playing" | "wishlist";

const DEFAULT_SORT: SortKey = "added";
const DEFAULT_STATUS: StatusFilter = "all";
const ALL_PLATFORMS = "all";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "الكل",
  completed: "مكتملة",
  playing: "قيد اللعب",
  wishlist: "للعب لاحقًا",
};

const STATUS_TABS: StatusFilter[] = ["all", "completed", "playing", "wishlist"];

export function CompletedGamesSection({ games }: { games: UserGame[] }) {
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(DEFAULT_STATUS);
  const [platform, setPlatform] = useState(ALL_PLATFORMS);

  const platforms = useMemo(
    () => Array.from(new Set(games.flatMap((game) => game.platforms))).sort(),
    [games],
  );

  const isDefault =
    sort === DEFAULT_SORT && platform === ALL_PLATFORMS && statusFilter === DEFAULT_STATUS;

  const visibleGames = useMemo(() => {
    let filtered = games;

    if (statusFilter !== "all") {
      filtered = filtered.filter((game) => game.status === statusFilter);
    }

    if (platform !== ALL_PLATFORMS) {
      filtered = filtered.filter((game) => game.platforms.includes(platform));
    }

    return [...filtered].sort((a, b) => {
      if (sort === "rating") {
        if (a.rating == null) return b.rating == null ? 0 : 1;
        if (b.rating == null) return -1;
        return b.rating - a.rating;
      }
      return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
    });
  }, [games, sort, statusFilter, platform]);

  const resetFilters = () => {
    setSort(DEFAULT_SORT);
    setStatusFilter(DEFAULT_STATUS);
    setPlatform(ALL_PLATFORMS);
  };

  const statusTabs = (
    <div className="flex gap-1" dir="rtl">
      {STATUS_TABS.map((s) => (
        <button
          key={s}
          onClick={() => setStatusFilter(s)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            statusFilter === s
              ? "bg-primary text-primary-foreground"
              : "bg-bg-elevated text-text-muted hover:text-text-primary"
          }`}
        >
          {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );

  return (
    <ExpandableSection
      title="الألعاب"
      items={visibleGames.map((game) => (
        <GameCard key={game.igdb_id} game={game} />
      ))}
      emptyText={
        games.length === 0
          ? "لم تُضف أي ألعاب بعد."
          : "لا توجد ألعاب تطابق هذا الفلتر."
      }
      columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-6"
      action={
        games.length > 0 && (
          <div className="flex items-center gap-2">
            {statusTabs}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="relative gap-1.5">
                    <SlidersHorizontal className="size-3.5" />
                    تصفية
                    {!isDefault && (
                      <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-primary ring-2 ring-background" />
                    )}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>ترتيب حسب</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={sort}
                    onValueChange={(value) => setSort(value as SortKey)}
                  >
                    <DropdownMenuRadioItem value="added">
                      تاريخ الإضافة
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="rating">
                      الأعلى تقييمًا
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>

                {platforms.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>النظام</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={platform} onValueChange={setPlatform}>
                        <DropdownMenuRadioItem value={ALL_PLATFORMS}>
                          كل الأنظمة
                        </DropdownMenuRadioItem>
                        {platforms.map((item) => (
                          <DropdownMenuRadioItem key={item} value={item}>
                            {item}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuGroup>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isDefault} onClick={resetFilters}>
                  <RotateCcw className="size-3.5" />
                  إعادة ضبط
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    />
  );
}
