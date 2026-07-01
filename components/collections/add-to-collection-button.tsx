"use client";

import { useState } from "react";
import { Box } from "lucide-react";

import { CollectionModal, type SelectedGame } from "./collection-modal";

/**
 * "Add to collection" button on a game page. Opens the new-collection modal
 * pre-seeded with the current game, so the game is included by default.
 */
export function AddToCollectionButton({ game }: { game: SelectedGame }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary"
      >
        <Box className="size-4" />
        اضافة الى مكتبة
      </button>
      {open && (
        <CollectionModal
          mode="create"
          onClose={() => setOpen(false)}
          seedGames={[game]}
        />
      )}
    </>
  );
}
