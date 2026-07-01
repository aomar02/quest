"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X, Loader2, Check, Trash2 } from "lucide-react";

import { RatingInput } from "./rating-input";
import { REVIEW_BODY_MAX } from "@/lib/reviews/shared";
import { upsertReview, deleteReview } from "@/app/(protected)/reviews/actions";

export type RateGame = {
  igdb_id: number;
  title: string;
  cover_url: string | null;
};

type ExistingReview = { rating: number; body: string | null };

/**
 * Rate / review modal for a game. Mounted only while open (the parent guards
 * with `{open && ...}`), so initial state comes straight from props — reopening
 * always reflects the latest server data. Shows a delete button when editing.
 */
export function ReviewModal({
  game,
  review,
  onClose,
}: {
  game: RateGame;
  review: ExistingReview | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEditing = review !== null;

  // numeric columns can arrive as strings from PostgREST — normalise to a number.
  const [rating, setRating] = useState(review ? Number(review.rating) : 0);
  const [body, setBody] = useState(review?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  // Escape to close + lock background scroll while open.
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

  const onSubmit = () => {
    setError(null);
    if (rating <= 0) {
      setError("اختر تقييماً بالنجوم أولاً");
      return;
    }
    startTransition(async () => {
      const result = await upsertReview({ igdbId: game.igdb_id, rating, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const onDelete = () => {
    setError(null);
    startDeleting(async () => {
      const result = await deleteReview(game.igdb_id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "تعديل التقييم" : "تقييم اللعبة"}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-secondary sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEditing ? "تعديل التقييم" : "تقييم اللعبة"}
          </h2>
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
          {/* Game header */}
          <div className="flex items-center gap-3">
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
            <p className="font-semibold text-text-primary">{game.title}</p>
          </div>

          {/* Star picker */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">
              تقييمك
            </span>
            <RatingInput value={rating} onChange={setRating} />
          </div>

          {/* Optional review text */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="review-body"
              className="text-sm font-medium text-text-secondary"
            >
              مراجعة (اختياري)
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(event) =>
                setBody(event.target.value.slice(0, REVIEW_BODY_MAX))
              }
              rows={4}
              placeholder="شاركنا رأيك في اللعبة..."
              className="resize-none rounded-lg border border-border bg-bg-elevated px-3 py-2 text-text-primary outline-none placeholder:text-text-muted focus:border-primary"
            />
            <span className="self-start text-xs text-text-muted">
              {body.length}/{REVIEW_BODY_MAX}
            </span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          {isEditing ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isDeleting || isPending}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              حذف
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isPending || isDeleting || rating <= 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isEditing ? "حفظ" : "نشر"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
