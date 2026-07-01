"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleLike } from "@/app/(protected)/social/actions";
import type { LikeTarget } from "@/lib/social/shared";

/**
 * Toggles the viewer's like on a review, collection, or comment. Optimistic via
 * local state (not useOptimistic) so the flip persists inside long-lived
 * surfaces like the review modal that aren't re-rendered by revalidation;
 * reverts if the server action fails. `igdbId` is an optional revalidation hint
 * for review likes (refreshes the game page's stale counts).
 */
export function LikeButton({
  target,
  igdbId,
  initialLiked,
  initialCount,
  iconClassName = "size-4",
  className,
  showCount = true,
}: {
  target: LikeTarget;
  igdbId?: number;
  initialLiked: boolean;
  initialCount: number;
  iconClassName?: string;
  className?: string;
  showCount?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isPending, startTransition] = useTransition();

  const onToggle = (event: React.MouseEvent) => {
    // Inside stretched-link cards the heart sits above the link; stop the click
    // from also navigating.
    event.preventDefault();
    event.stopPropagation();

    const prevLiked = liked;
    const prevCount = count;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount(prevCount + (nextLiked ? 1 : -1));

    startTransition(async () => {
      const result = await toggleLike({ ...target, igdbId });
      if (!result.ok) {
        setLiked(prevLiked);
        setCount(prevCount);
      } else {
        setLiked(result.liked);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={liked}
      aria-label={liked ? "إلغاء الإعجاب" : "إعجاب"}
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors disabled:opacity-60",
        liked ? "text-rose-500" : "text-text-secondary hover:text-rose-500",
        className,
      )}
    >
      <Heart
        className={cn(iconClassName, "transition-colors", liked && "fill-rose-500")}
      />
      {showCount && <span className="text-xs tabular-nums">{count}</span>}
    </button>
  );
}
