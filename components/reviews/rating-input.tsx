"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { RATING_MAX } from "@/lib/reviews/shared";

/**
 * Interactive half-star picker. Each star is split into two hit areas: the left
 * half selects `n - 0.5`, the right half selects `n`. Hovering previews the
 * value; the committed `value` shows otherwise. Forced LTR so "left half" is
 * visually the start of the star even on RTL pages.
 */
export function RatingInput({
  value,
  onChange,
  size = "size-9",
}: {
  value: number;
  onChange: (value: number) => void;
  size?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div
      dir="ltr"
      className="flex items-center gap-1"
      onMouseLeave={() => setHover(null)}
      role="radiogroup"
      aria-label="التقييم بالنجوم"
    >
      {Array.from({ length: RATING_MAX }).map((_, index) => {
        const full = index + 1;
        const half = index + 0.5;
        const fill = Math.max(0, Math.min(1, shown - index));

        return (
          <div key={index} className="relative">
            <div className={cn("relative", size)}>
              <Star className={cn("size-full text-text-muted")} />
              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className="size-full fill-amber-400 text-amber-400" />
              </div>
            </div>

            {/* Left half → x.5 */}
            <button
              type="button"
              role="radio"
              aria-checked={value === half}
              aria-label={`${half} نجمة`}
              onMouseEnter={() => setHover(half)}
              onClick={() => onChange(half)}
              className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
            />
            {/* Right half → x.0 */}
            <button
              type="button"
              role="radio"
              aria-checked={value === full}
              aria-label={`${full} نجمة`}
              onMouseEnter={() => setHover(full)}
              onClick={() => onChange(full)}
              className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
            />
          </div>
        );
      })}

      <span className="ms-2 min-w-8 text-sm font-semibold text-text-secondary">
        {shown > 0 ? shown.toFixed(1) : "—"}
      </span>
    </div>
  );
}
