import Image from "next/image";

import { getMarqueeCovers } from "@/lib/games/marquee";
import type { GameCover } from "@/lib/igdb/client";

// Each column scrolls at its own speed/direction (masterclass.com-style) so
// they don't drift in lockstep.
const COLUMNS = [
  { duration: 42, direction: "up" as const },
  { duration: 55, direction: "down" as const },
  { duration: 36, direction: "up" as const },
];

function splitIntoColumns(covers: GameCover[], count: number): GameCover[][] {
  const columns: GameCover[][] = Array.from({ length: count }, () => []);
  covers.forEach((cover, i) => columns[i % count].push(cover));
  return columns;
}

export async function AuthMarquee() {
  const covers = await getMarqueeCovers();
  if (covers.length === 0) return null;

  const columns = splitIntoColumns(covers, COLUMNS.length).filter(
    (column) => column.length > 0,
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-bg-secondary">
      <div className="absolute inset-0 flex gap-4 p-4">
        {columns.map((column, i) => (
          <MarqueeColumn key={i} covers={column} {...COLUMNS[i % COLUMNS.length]} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg-secondary via-transparent to-bg-secondary" />
    </div>
  );
}

function MarqueeColumn({
  covers,
  duration,
  direction,
}: {
  covers: GameCover[];
  duration: number;
  direction: "up" | "down";
}) {
  // Render the column's covers twice back-to-back: translating the track by
  // exactly -50% of its own height then lands on an identical copy, so the
  // loop has no visible seam.
  const track = [...covers, ...covers];

  return (
    <div className="flex-1 overflow-hidden">
      <div
        className={
          direction === "up"
            ? "flex flex-col gap-4 animate-marquee-up"
            : "flex flex-col gap-4 animate-marquee-down"
        }
        style={{ animationDuration: `${duration}s` }}
      >
        {track.map((cover, i) => (
          <div
            key={`${cover.igdbId}-${i}`}
            className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-xl border border-border"
          >
            <Image
              src={cover.coverUrl}
              alt=""
              fill
              sizes="200px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
