import Image from "next/image";
import Link from "next/link";

import { StarRating } from "@/components/reviews/star-rating";
import type { ReviewWithGame } from "@/lib/profile/data";

export function ReviewCard({ review }: { review: ReviewWithGame }) {
  const game = review.games;

  return (
    <Link
      href={`/games/${game.igdb_id}`}
      className="flex gap-3 rounded-xl border border-border bg-bg-elevated p-3 transition-colors hover:bg-bg-secondary"
    >
      <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
        {game.cover_url && (
          <Image
            src={game.cover_url}
            alt={game.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="truncate font-semibold text-text-primary">{game.title}</p>
        <StarRating value={review.rating} starClassName="size-3.5" />
        {review.body && (
          <p className="line-clamp-3 text-sm text-text-secondary">{review.body}</p>
        )}
      </div>
    </Link>
  );
}
