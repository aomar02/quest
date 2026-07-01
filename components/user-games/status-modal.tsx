"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  Loader2,
  Check,
  Trash2,
  Star,
  Gamepad2,
  CheckCircle2,
  Heart,
  type LucideIcon,
} from "lucide-react";

import type { RateGame } from "@/components/reviews/review-modal";
import {
  LIBRARY_STATUSES,
  STATUS_LABELS,
  type LibraryStatus,
} from "@/lib/user-games/shared";
import {
  setGameStatus,
  removeGameStatus,
} from "@/app/(protected)/user-games/actions";

const STATUS_ICONS: Record<LibraryStatus, LucideIcon> = {
  playing: Gamepad2,
  completed: CheckCircle2,
  wishlist: Heart,
};

/**
 * "Add to profile" modal. Lets the viewer pick a status (playing / completed /
 * wishlist) for a game, change it, or remove the game from their profile. Also
 * offers a shortcut into the rate/review modal via `onRate`. Mounted only while
 * open (parent guards with `{open && ...}`), so initial state comes from props.
 */
export function StatusModal({
  game,
  currentStatus,
  review,
  onRate,
  onClose,
}: {
  game: RateGame;
  currentStatus: LibraryStatus | null;
  review: { rating: number; body: string | null } | null;
  onRate: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const isEditing = currentStatus !== null;

  const [status, setStatus] = useState<LibraryStatus | null>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRemoving, startRemoving] = useTransition();

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

  const onSave = () => {
    setError(null);
    if (!status) {
      setError("اختر حالة أولاً");
      return;
    }
    startTransition(async () => {
      const result = await setGameStatus(game.igdb_id, status);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const onRemove = () => {
    setError(null);
    startRemoving(async () => {
      const result = await removeGameStatus(game.igdb_id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const busy = isPending || isRemoving;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? "تعديل الحالة" : "أضف إلى ملفك"}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-secondary sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {isEditing ? "تعديل الحالة" : "أضف إلى ملفك"}
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

          {/* Status picker */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-secondary">
              الحالة
            </span>
            <div className="grid grid-cols-3 gap-2">
              {LIBRARY_STATUSES.map((option) => {
                const Icon = STATUS_ICONS[option];
                const selected = status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStatus(option)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-sm font-medium transition-colors ${
                      selected
                        ? "border-primary bg-primary/10 text-text-primary"
                        : "border-border bg-bg-elevated text-text-secondary hover:bg-bg-secondary"
                    }`}
                  >
                    <Icon
                      className={`size-5 ${
                        selected ? "text-primary" : "text-text-muted"
                      }`}
                    />
                    {STATUS_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rate shortcut */}
          <button
            type="button"
            onClick={onRate}
            className="flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary"
          >
            <span className="flex items-center gap-2">
              <Star
                className={
                  review
                    ? "size-4 fill-amber-400 text-amber-400"
                    : "size-4 text-text-secondary"
                }
              />
              {review
                ? `تقييمك ${Number(review.rating).toFixed(1)} — عدّل التقييم`
                : "قيّم اللعبة"}
            </span>
          </button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          {isEditing ? (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
            >
              {isRemoving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              إزالة
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
              onClick={onSave}
              disabled={busy || !status}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
