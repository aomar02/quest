"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { ReviewModal, type RateGame } from "./review-modal";

/**
 * "Rate" button on a game page. Opens the review modal seeded with the viewer's
 * existing review (if any), so the same button both creates and edits. When the
 * viewer has already rated, it shows their score instead of a generic label.
 */
export function RateButton({
  game,
  review,
}: {
  game: RateGame;
  review: { rating: number; body: string | null } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary"
      >
        <Star
          className={
            review
              ? "size-4 fill-amber-400 text-amber-400"
              : "size-4 text-text-secondary"
          }
        />
        {review ? `تقييمك ${Number(review.rating).toFixed(1)}` : "قيّم اللعبة"}
      </button>
      {open && (
        <ReviewModal
          game={game}
          review={review}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
