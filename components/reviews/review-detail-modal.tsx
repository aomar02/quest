"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  Heart,
  Gamepad2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LikeButton } from "@/components/social/like-button";
import { CommentThread } from "@/components/social/comment-thread";
import { StarRating } from "./star-rating";
import { STATUS_DOT_COLOR, formatReviewDate } from "./review-item";
import { STATUS_LABELS, type LibraryStatus } from "@/lib/user-games/shared";
import type { GameReview, RecentReview } from "@/lib/reviews/data";

const STATUS_ICONS: Record<LibraryStatus, LucideIcon> = {
  playing: Gamepad2,
  completed: CheckCircle2,
  wishlist: Heart,
};

/**
 * Full-screen view of a single review: author, the game it's about (when
 * known), star rating, the reviewer's library status for the game, and the
 * complete review body, plus the like button and the full Reddit-style comment
 * thread (loaded on open). Opened from `ReviewItem`'s "فتح المراجعة" link.
 */
export function ReviewDetailModal({
  review,
  reviewerStatus,
  onClose,
}: {
  review: GameReview | RecentReview;
  reviewerStatus: LibraryStatus | null;
  onClose: () => void;
}) {
  const author = review.author;
  const game = "games" in review ? review.games : null;
  const initial = author?.display_name?.[0] ?? "؟";
  const StatusIcon = reviewerStatus ? STATUS_ICONS[reviewerStatus] : null;
  const [commentCount, setCommentCount] = useState(review.comment_count);

  useEffect(() => {
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

  return createPortal(
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="المراجعة"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-secondary sm:h-auto sm:max-h-[85vh] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">المراجعة</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-md p-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          {game && (
            <Link
              href={`/games/${game.igdb_id}`}
              className="flex items-center gap-3"
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
              <p className="font-semibold text-text-primary hover:underline">
                {game.title}
              </p>
            </Link>
          )}

          <div className="flex items-center justify-between gap-3">
            {author ? (
              <Link
                href={`/profile/${author.username}`}
                className="flex min-w-0 items-center gap-2 hover:underline"
              >
                <Avatar className="size-10">
                  <AvatarImage src={author.avatar_url ?? undefined} alt={author.display_name} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-text-primary">
                    {author.display_name}
                  </span>
                  <span className="truncate text-xs text-text-muted">
                    @{author.username}
                  </span>
                </div>
              </Link>
            ) : (
              <span className="text-sm text-text-muted">مستخدم محذوف</span>
            )}
            <span className="shrink-0 text-xs text-text-muted">
              {formatReviewDate(review.created_at)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StarRating value={review.rating} starClassName="size-4" />
            <span className="text-sm font-semibold text-text-primary">
              {Number(review.rating).toFixed(1)}
            </span>
            {reviewerStatus && StatusIcon && (
              <span className="flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-text-secondary">
                <span
                  className={`size-1.5 rounded-full ${STATUS_DOT_COLOR[reviewerStatus]}`}
                />
                <StatusIcon className="size-3.5" />
                {STATUS_LABELS[reviewerStatus]}
              </span>
            )}
          </div>

          {review.body && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary/80">
              {review.body}
            </p>
          )}

          <div className="border-t border-border pt-5">
            <CommentThread
              target={{ reviewId: review.id }}
              igdbId={review.igdb_id}
              autoLoad
              onCountChange={setCommentCount}
            />
          </div>
        </div>

        <div className="flex items-center gap-5 border-t border-border px-5 py-4 text-sm text-text-muted">
          <LikeButton
            target={{ reviewId: review.id }}
            igdbId={review.igdb_id}
            initialLiked={review.viewer_liked}
            initialCount={review.like_count}
            iconClassName="size-5"
          />
          <span className="flex items-center gap-1.5">
            {commentCount} تعليق
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
