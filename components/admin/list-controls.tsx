import Link from "next/link";

import { cn } from "@/lib/utils";

/** Search box for an admin list page. A plain GET form so the query lives in the URL — no client JS needed. */
export function AdminSearchForm({ basePath, query }: { basePath: string; query: string }) {
  return (
    <form action={basePath} className="flex items-center gap-2">
      <input
        type="text"
        name="q"
        defaultValue={query}
        placeholder="بحث..."
        className="h-9 w-full max-w-xs rounded-lg border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none"
      />
    </form>
  );
}

/** Prev/Next pagination for an admin list page, driven entirely by `offset`/`q` search params. */
export function AdminPagination({
  basePath,
  query,
  offset,
  pageSize,
  hasMore,
}: {
  basePath: string;
  query: string;
  offset: number;
  pageSize: number;
  hasMore: boolean;
}) {
  const qParam = query ? `&q=${encodeURIComponent(query)}` : "";
  const prevOffset = Math.max(0, offset - pageSize);
  const atStart = offset === 0;

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`${basePath}?offset=${prevOffset}${qParam}`}
        aria-disabled={atStart}
        className={cn(
          "rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors",
          atStart ? "pointer-events-none opacity-40" : "hover:bg-bg-elevated hover:text-text-primary",
        )}
      >
        السابق
      </Link>
      <Link
        href={`${basePath}?offset=${offset + pageSize}${qParam}`}
        aria-disabled={!hasMore}
        className={cn(
          "rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary transition-colors",
          !hasMore ? "pointer-events-none opacity-40" : "hover:bg-bg-elevated hover:text-text-primary",
        )}
      >
        التالي
      </Link>
    </div>
  );
}
