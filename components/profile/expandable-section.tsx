"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const VISIBLE_COUNT = 6;

export function ExpandableSection({
  title,
  items,
  emptyText,
  columns,
  action,
}: {
  title: string;
  items: React.ReactNode[];
  emptyText: string;
  columns: string;
  action?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > VISIBLE_COUNT;
  const visibleItems = expanded ? items : items.slice(0, VISIBLE_COUNT);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">
          {title} <span className="text-text-muted">({items.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          {action}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex items-center gap-1 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            {expanded ? "عرض أقل" : "عرض الكل"}
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </button>
        )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-text-muted">{emptyText}</p>
      ) : (
        <div className={cn("mt-4 grid gap-x-4 gap-y-6", columns)}>
          {visibleItems}
        </div>
      )}
    </section>
  );
}
