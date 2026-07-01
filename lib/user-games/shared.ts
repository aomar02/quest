// Status options surfaced in the "add to profile" flow. These are a subset of
// the `game_status` enum in the database (which also has backlog/dropped) —
// only the three statuses the product exposes to users live here. Kept free of
// server-only imports so client components can use it directly.

export const LIBRARY_STATUSES = ["playing", "completed", "wishlist"] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

// Arabic labels shown in the status modal and on the game-page button.
export const STATUS_LABELS: Record<LibraryStatus, string> = {
  playing: "ألعبها الآن",
  completed: "أكملتها",
  wishlist: "قائمة الرغبات",
};

/** True when `value` is one of the user-facing library statuses. */
export function isLibraryStatus(value: unknown): value is LibraryStatus {
  return (
    typeof value === "string" &&
    (LIBRARY_STATUSES as readonly string[]).includes(value)
  );
}
