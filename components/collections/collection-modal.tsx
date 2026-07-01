"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Loader2, Plus, Check } from "lucide-react";

import { useGameSearch } from "@/components/search/use-game-search";
import {
  createCollection,
  updateCollection,
} from "@/app/(protected)/collections/actions";

// Minimal game shape the modal needs to render a chip and submit an id.
export type SelectedGame = {
  igdb_id: number;
  title: string;
  cover_url: string | null;
};

const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;

// The modal is mounted only while open (parents guard with `{open && ...}`), so
// initial form state comes straight from props — no effect-based seeding, and
// reopening always starts fresh.
type ModalProps = {
  onClose: () => void;
} & (
  | { mode: "create"; seedGames?: SelectedGame[]; collection?: never }
  | {
      mode: "edit";
      collection: {
        id: string;
        name: string;
        description: string | null;
        games: SelectedGame[];
      };
      seedGames?: never;
    }
);

export function CollectionModal(props: ModalProps) {
  const { onClose, mode } = props;
  const router = useRouter();

  const [name, setName] = useState(
    props.mode === "edit" ? props.collection.name : "",
  );
  const [description, setDescription] = useState(
    props.mode === "edit" ? (props.collection.description ?? "") : "",
  );
  const [selected, setSelected] = useState<SelectedGame[]>(
    props.mode === "edit" ? props.collection.games : (props.seedGames ?? []),
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { results, isLoading } = useGameSearch(query);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Escape to close + lock background scroll while open.
  useEffect(() => {
    firstFieldRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const selectedIds = new Set(selected.map((game) => game.igdb_id));
  const searchResults = results.filter((game) => !selectedIds.has(game.igdb_id));

  const addGame = (game: SelectedGame) => {
    setSelected((prev) => [
      { igdb_id: game.igdb_id, title: game.title, cover_url: game.cover_url },
      ...prev,
    ]);
    setQuery("");
  };

  const removeGame = (igdbId: number) => {
    setSelected((prev) => prev.filter((game) => game.igdb_id !== igdbId));
  };

  const onSubmit = () => {
    setError(null);
    startTransition(async () => {
      const input = {
        name,
        description,
        igdbIds: selected.map((game) => game.igdb_id),
      };
      const result =
        props.mode === "edit"
          ? await updateCollection(props.collection.id, input)
          : await createCollection(input);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onClose();
      if (props.mode === "create") {
        router.push(`/collections/${result.id}`);
      } else {
        router.refresh();
      }
    });
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit" ? "تعديل المجموعة" : "مجموعة جديدة"}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-bg-secondary sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            {mode === "edit" ? "تعديل المجموعة" : "مجموعة جديدة"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-md p-1 text-text-secondary transition-colors hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="collection-name"
              className="text-sm font-medium text-text-secondary"
            >
              الاسم
            </label>
            <input
              id="collection-name"
              ref={firstFieldRef}
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, NAME_MAX))}
              placeholder="اسم المجموعة"
              className="rounded-lg border border-border bg-bg-elevated px-3 py-2 text-text-primary outline-none placeholder:text-text-muted focus:border-primary"
            />
            <span className="self-start text-xs text-text-muted">
              {name.length}/{NAME_MAX}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="collection-description"
              className="text-sm font-medium text-text-secondary"
            >
              الوصف
            </label>
            <textarea
              id="collection-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value.slice(0, DESCRIPTION_MAX))
              }
              rows={2}
              placeholder="وصف مختصر للمجموعة"
              className="resize-none rounded-lg border border-border bg-bg-elevated px-3 py-2 text-text-primary outline-none placeholder:text-text-muted focus:border-primary"
            />
            <span className="self-start text-xs text-text-muted">
              {description.length}/{DESCRIPTION_MAX}
            </span>
          </div>

          {/* Selected games */}
          {selected.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-secondary">
                الألعاب ({selected.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {selected.map((game) => (
                  <div
                    key={game.igdb_id}
                    className="group relative h-20 w-14 overflow-hidden rounded-md border border-border bg-bg-elevated"
                    title={game.title}
                  >
                    {game.cover_url && (
                      <Image
                        src={game.cover_url}
                        alt={game.title}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeGame(game.igdb_id)}
                      aria-label={`إزالة ${game.title}`}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game search */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2">
              <Search className="size-4 shrink-0 text-text-secondary" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن لعبة لإضافتها..."
                className="w-full bg-transparent text-text-primary outline-none placeholder:text-text-muted"
              />
              {isLoading && (
                <Loader2 className="size-4 shrink-0 animate-spin text-text-secondary" />
              )}
            </div>

            {searchResults.length > 0 && (
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {searchResults.map((game) => (
                  <li key={game.igdb_id}>
                    <button
                      type="button"
                      onClick={() => addGame(game)}
                      className="flex w-full items-center gap-3 rounded-lg p-2 text-start transition-colors hover:bg-bg-elevated"
                    >
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-bg-elevated">
                        {game.cover_url && (
                          <Image
                            src={game.cover_url}
                            alt={game.title}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                        {game.title}
                      </span>
                      <Plus className="size-4 shrink-0 text-primary" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {mode === "edit" ? "حفظ" : "إنشاء"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
