"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Loader2 } from "lucide-react";

import { CollectionModal, type SelectedGame } from "./collection-modal";
import { deleteCollection } from "@/app/(protected)/collections/actions";

/** Edit + delete controls shown to the owner on a collection detail page. */
export function CollectionOwnerActions({
  collection,
}: {
  collection: {
    id: string;
    name: string;
    description: string | null;
    games: SelectedGame[];
  };
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onDelete = () => {
    if (!confirm("هل تريد حذف هذه المجموعة؟")) return;
    startTransition(() => {
      // deleteCollection redirects to /profile on success.
      void deleteCollection(collection.id);
    });
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary"
        >
          <Pencil className="size-4" />
          تعديل
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
          حذف
        </button>
      </div>

      {editing && (
        <CollectionModal
          mode="edit"
          onClose={() => setEditing(false)}
          collection={collection}
        />
      )}
    </>
  );
}
