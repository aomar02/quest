import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { RATING_MAX } from "@/lib/reviews/shared";

/**
 * Read-only star rating that supports half stars. Each of the five slots draws
 * an empty star with a filled star clipped on top to `value - index` of its
 * width, so 4.5 shows four full stars and one half. Forced LTR so the clip
 * always fills from the left, even inside RTL pages.
 */
export function StarRating({
  value,
  className,
  starClassName = "size-4",
}: {
  value: number;
  className?: string;
  starClassName?: string;
}) {
  // numeric columns can arrive as strings from PostgREST — coerce defensively.
  const rating = Number(value) || 0;

  return (
    <div dir="ltr" className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: RATING_MAX }).map((_, index) => {
        const fill = Math.max(0, Math.min(1, rating - index));
        return (
          <div key={index} className="relative">
            <Star className={cn(starClassName, "text-text-muted")} />
            <div
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star className={cn(starClassName, "fill-amber-400 text-amber-400")} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
