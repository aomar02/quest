"use client";

import { useState } from "react";
import { Plus, Gamepad2, CheckCircle2, Heart, type LucideIcon } from "lucide-react";

import { ReviewModal, type RateGame } from "@/components/reviews/review-modal";
import { StatusModal } from "./status-modal";
import { STATUS_LABELS, type LibraryStatus } from "@/lib/user-games/shared";

const STATUS_ICONS: Record<LibraryStatus, LucideIcon> = {
  playing: Gamepad2,
  completed: CheckCircle2,
  wishlist: Heart,
};

/**
 * "Add to profile" button on a game page. Opens the status modal (set / change /
 * remove the game's status), which can hand off to the rate modal. Once the game
 * is in the viewer's profile, the button reflects the current status instead of
 * the generic "add" label, so the same button both adds and edits.
 */
export function AddToProfileButton({
  game,
  status,
  review,
}: {
  game: RateGame;
  status: LibraryStatus | null;
  review: { rating: number; body: string | null } | null;
}) {
  // Only one modal is shown at a time; `view` tracks which (or none).
  const [view, setView] = useState<"none" | "status" | "review">("none");

  const Icon = status ? STATUS_ICONS[status] : Plus;

  return (
    <>
      <button
        type="button"
        onClick={() => setView("status")}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          status
            ? "bg-primary text-primary-foreground hover:bg-primary-hover"
            : "border border-border bg-bg-elevated text-text-primary hover:bg-bg-secondary"
        }`}
      >
        <Icon className="size-4" />
        {status ? STATUS_LABELS[status] : "أضف إلى ملفك"}
      </button>

      {view === "status" && (
        <StatusModal
          game={game}
          currentStatus={status}
          review={review}
          onRate={() => setView("review")}
          onClose={() => setView("none")}
        />
      )}

      {view === "review" && (
        <ReviewModal
          game={game}
          review={review}
          onClose={() => setView("none")}
        />
      )}
    </>
  );
}
