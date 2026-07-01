"use client";

import { useOptimistic, useTransition } from "react";
import { Bookmark } from "lucide-react";

import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/app/(protected)/collections/actions";

/**
 * Toggles the viewer's bookmark on a collection. Optimistic: the icon flips
 * immediately and reverts if the server action fails. Used both as a compact
 * icon on collection cards and as a labelled button on the detail page.
 */
export function BookmarkButton({
  collectionId,
  initialBookmarked,
  withLabel = false,
  className,
}: {
  collectionId: string;
  initialBookmarked: boolean;
  withLabel?: boolean;
  className?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [bookmarked, setBookmarked] = useOptimistic(initialBookmarked);

  const onToggle = () => {
    startTransition(async () => {
      setBookmarked(!bookmarked);
      const result = await toggleBookmark(collectionId);
      if (!result.ok) {
        // Revert the optimistic flip; useOptimistic resets to the prop on the
        // next render, so re-setting to the known-true value is enough.
        setBookmarked(initialBookmarked);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "إزالة الحفظ" : "حفظ المجموعة"}
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors disabled:opacity-60",
        withLabel
          ? "rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-secondary"
          : "text-text-secondary hover:text-primary",
        className,
      )}
    >
      <Bookmark
        className={cn(
          "size-5 transition-colors",
          bookmarked && "fill-primary text-primary",
        )}
      />
      {withLabel && (bookmarked ? "محفوظة" : "حفظ")}
    </button>
  );
}
