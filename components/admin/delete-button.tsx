"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";

import type { AdminActionResult } from "@/app/(protected)/admin/actions";

/**
 * Shared delete control for every admin list row. `action` is a server action
 * pre-bound to the row's id (e.g. `adminDeleteCollection.bind(null, row.id)`),
 * so this component stays generic across users/collections/reviews/comments.
 */
export function AdminDeleteButton({
  action,
  confirmMessage,
}: {
  action: () => Promise<AdminActionResult>;
  confirmMessage: string;
}) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    if (!confirm(confirmMessage)) return;
    startTransition(async () => {
      const result = await action();
      if (!result.ok) alert(result.error);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label="حذف"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </button>
  );
}
