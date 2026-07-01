import Link from "next/link";
import Image from "next/image";

import type { Game } from "@/lib/games/cache";

export function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/games/${game.igdb_id}`}
      className="group relative block focus-visible:outline-none"
    >
      <div className="relative aspect-[3/4] overflow-hidden border border-border bg-bg-elevated outline outline-1 outline-offset-2 outline-transparent transition-[outline-color] duration-300 group-hover:outline-primary group-focus-visible:outline-primary">
        {game.cover_url ? (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 200px"
            className="object-cover"
          />
        ) : null}
      </div>
    </Link>
  );
}
