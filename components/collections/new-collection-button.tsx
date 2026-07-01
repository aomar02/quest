"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { CollectionModal } from "./collection-modal";

/** "New collection" entry point for the profile page. */
export function NewCollectionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        <Plus className="size-4" />
        مجموعة جديدة
      </button>
      {open && (
        <CollectionModal mode="create" onClose={() => setOpen(false)} />
      )}
    </>
  );
}
