"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LikeButton } from "@/components/social/like-button";
import { StarRating } from "./star-rating";
import { ReviewDetailModal } from "./review-detail-modal";
import { STATUS_LABELS, type LibraryStatus } from "@/lib/user-games/shared";
import type { GameReview, RecentReview } from "@/lib/reviews/data";

export const STATUS_DOT_COLOR: Record<LibraryStatus, string> = {
  playing: "bg-sky-500",
  completed: "bg-emerald-500",
  wishlist: "bg-rose-500",
};

export function formatReviewDate(value: string): string {
  return new Intl.DateTimeFormat("ar", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * A single review as it appears in a feed: the author (linking to their public
 * profile), their star rating, the date, and the body. When `showGame` is set
 * (the homepage rail), it also shows the reviewed game's title linking to the
 * game page. `reviewerStatus`, when known, shows the author's library status
 * for the game (e.g. "Completed") next to their rating. Like/comment counts
 * are placeholders only — clicking "فتح المراجعة" opens the full review.
 */
export function ReviewItem({
  review,
  showGame = false,
  reviewerStatus = null,
}: {
  review: GameReview | RecentReview;
  showGame?: boolean;
  reviewerStatus?: LibraryStatus | null;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const author = review.author;
  const game = "games" in review ? review.games : null;
  const initial = author?.display_name?.[0] ?? "؟";

  return (
    <>
      <article className="flex w-full flex-col gap-3 rounded-xl border border-border bg-bg-primary p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {author ? (
              <Link href={`/profile/${author.username}`} className="shrink-0">
                <Avatar className="size-10">
                  <AvatarImage src={author.avatar_url ?? undefined} alt={author.display_name} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Avatar className="size-10 shrink-0">
                <AvatarFallback>؟</AvatarFallback>
              </Avatar>
            )}

            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                {author ? (
                  <Link
                    href={`/profile/${author.username}`}
                    className="font-semibold text-text-primary hover:underline"
                  >
                    {author.display_name}
                  </Link>
                ) : (
                  <span className="font-semibold text-text-muted">
                    مستخدم محذوف
                  </span>
                )}
                {showGame && game && (
                  <>
                    <span className="text-text-muted">قيّم</span>
                    <Link
                      href={`/games/${game.igdb_id}`}
                      className="font-semibold text-text-primary hover:underline"
                    >
                      {game.title}
                    </Link>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={review.rating} starClassName="size-3.5" />
                {reviewerStatus && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span
                      className={`size-1.5 rounded-full ${STATUS_DOT_COLOR[reviewerStatus]}`}
                    />
                    {STATUS_LABELS[reviewerStatus]}
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="shrink-0 text-xs text-text-muted">
            {formatReviewDate(review.created_at)}
          </span>
        </div>

        {review.body && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary/80">
            {review.body}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-4">
            <LikeButton
              target={{ reviewId: review.id }}
              igdbId={review.igdb_id}
              initialLiked={review.viewer_liked}
              initialCount={review.like_count}
            />
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              className="flex items-center gap-1.5 transition-colors hover:text-text-primary"
            >
              <MessageCircle className="size-4" />
              {review.comment_count}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="font-medium text-text-secondary transition-colors hover:text-text-primary hover:underline"
          >
            فتح المراجعة
          </button>
        </div>
      </article>

      {detailOpen && (
        <ReviewDetailModal
          review={review}
          reviewerStatus={reviewerStatus}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </>
  );
}
