import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CollectionCardData } from "@/lib/collections/data";
import { LikeButton } from "@/components/social/like-button";
import { BookmarkButton } from "./bookmark-button";

const PREVIEW_SLOTS = 5;

/**
 * A collection preview card: a fanned stack of up to five game covers (the
 * first one frontmost, the rest cascading behind it) with the name, a
 * bookmark toggle and author/game count below it.
 */
export function CollectionCard({
  collection,
}: {
  collection: CollectionCardData;
}) {
  const { previewGames, author } = collection;

  return (
    <article className="group relative flex w-full flex-col gap-3">
      {/* Stretched link covers the whole card for navigation. */}
      <Link
        href={`/collections/${collection.id}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={collection.name}
      />

      {/* Fanned cover stack — the card's width hugs this stack's width. */}
      <div className="flex h-36 items-center justify-start overflow-hidden px-1 sm:h-44" aria-hidden>
        {Array.from({ length: PREVIEW_SLOTS }).map((_, i) => {
          const game = previewGames[i];
          return (
            <div
              key={i}
              className={cn(
                "relative aspect-[3/4] h-[85%] overflow-hidden",
                i > 0 && "-ml-6",
              )}
              style={{ zIndex: PREVIEW_SLOTS - i }}
            >
              {game?.cover_url && (
                <Image
                  src={game.cover_url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 18vw, 110px"
                  className="object-cover"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Title and info live below the cover stack. */}
      <div className="flex flex-col gap-2 px-1">
        <h3 className="pointer-events-none truncate text-lg font-semibold text-text-primary">
          {collection.name}
        </h3>
        <div className="flex flex-col items-start gap-1.5 text-xs text-text-muted">
          <div className="pointer-events-auto z-20 flex items-center gap-3">
            <BookmarkButton
              collectionId={collection.id}
              initialBookmarked={collection.isBookmarked}
            />
            <LikeButton
              target={{ collectionId: collection.id }}
              initialLiked={collection.isLiked}
              initialCount={collection.like_count}
              iconClassName="size-5"
            />
            <Link
              href={`/collections/${collection.id}`}
              className="pointer-events-auto z-20 flex items-center gap-1.5 text-text-secondary transition-colors hover:text-text-primary"
            >
              <MessageCircle className="size-5" />
              <span className="text-xs tabular-nums">
                {collection.comment_count}
              </span>
            </Link>
          </div>
          <div className="pointer-events-none flex items-center gap-2">
            {author ? (
              <Link
                href={`/profile/${author.username}`}
                className="pointer-events-auto hover:text-text-primary hover:underline"
              >
                {author.display_name}
              </Link>
            ) : (
              <span>—</span>
            )}
            <span className="shrink-0">{collection.gameCount} لعبة</span>
          </div>
        </div>
      </div>
    </article>
  );
}
