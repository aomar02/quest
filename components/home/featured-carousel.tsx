"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Game } from "@/lib/games/cache";
import type { FeaturedSlide } from "@/lib/featured/data";

const AUTO_ADVANCE_MS = 7000;
const STACK_SLOTS = 4;

/**
 * The homepage's top banner: a full-width, auto-advancing carousel mixing
 * one featured collection slide with two featured game slides (see
 * `lib/featured/data`). Built from scratch rather than a carousel library —
 * three slides with a cross-fade is simple enough not to need one.
 */
export function FeaturedCarousel({ slides }: { slides: FeaturedSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const timer = setInterval(next, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [next, paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      className="relative h-[520px] w-full overflow-hidden sm:h-[500px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            i === index ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <FeaturedSlideContent slide={slide} />
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="الشريحة السابقة"
            className="absolute inset-y-0 right-0 z-20 flex w-12 items-center justify-center text-white/70 transition-colors hover:text-white sm:w-16"
          >
            <ChevronRight className="size-7" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="الشريحة التالية"
            className="absolute inset-y-0 left-0 z-20 flex w-12 items-center justify-center text-white/70 transition-colors hover:text-white sm:w-16"
          >
            <ChevronLeft className="size-7" />
          </button>

          <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`الانتقال إلى الشريحة ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index
                    ? "w-8 bg-primary"
                    : "w-4 bg-white/30 hover:bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function FeaturedSlideContent({ slide }: { slide: FeaturedSlide }) {
  if (slide.type === "collection") {
    const { collection } = slide;
    return (
      <Link
        href={`/collections/${collection.id}`}
        className="relative block h-full w-full focus-visible:outline-none"
      >
        <SlideBackground images={collection.previewGames.map((g) => g.cover_url)} />
        <SlideLayout
          label="مكتبة مختارة"
          title={collection.name}
          description={collection.description}
          card={<CoverStack previewGames={collection.previewGames} />}
          meta={
            <>
              {collection.author && <span>{collection.author.display_name}</span>}
              <span>{collection.gameCount} لعبة</span>
            </>
          }
        />
      </Link>
    );
  }

  const { game } = slide;
  return (
    <Link
      href={`/games/${game.igdb_id}`}
      className="relative block h-full w-full focus-visible:outline-none"
    >
      <SlideBackground images={[game.banner_url ?? game.cover_url]} />
      <SlideLayout
        label="لعبة مختارة"
        title={game.title}
        description={game.description}
        card={
          <div className="relative aspect-[3/4] w-28 overflow-hidden rounded-xl border border-border bg-bg-elevated sm:w-56">
            {game.cover_url && (
              <Image
                src={game.cover_url}
                alt={game.title}
                fill
                sizes="220px"
                className="object-cover"
              />
            )}
          </div>
        }
        meta={
          <>
            {game.publisher && <span>{game.publisher}</span>}
            {game.release_date && (
              <span className="rounded-full border border-border bg-bg-elevated/60 px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                {new Date(game.release_date).getFullYear()}
              </span>
            )}
          </>
        }
      />
    </Link>
  );
}

function SlideBackground({ images }: { images: (string | null)[] }) {
  const valid = images.filter((src): src is string => Boolean(src));

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 flex">
        {(valid.length > 0 ? valid : [null]).map((src, i) => (
          <div key={i} className="relative h-full flex-1">
            {src && (
              <Image src={src} alt="" fill sizes="100vw" className="object-cover" />
            )}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
    </div>
  );
}

function SlideLayout({
  label,
  title,
  description,
  card,
  meta,
}: {
  label: string;
  title: string;
  description: string | null;
  card: React.ReactNode;
  meta: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-4 py-6 sm:flex-row sm:gap-10 sm:px-12 sm:py-10 lg:px-20">
      {/* DOM order is swapped vs. visual order: under dir="rtl" the first
          row child renders rightmost, so the title block (which must end up
          on the right) is listed second and pulled to position 1. */}
      <div className="order-2 flex max-w-md flex-col items-center text-center sm:order-1 sm:items-end sm:text-right">
        <div className="flex w-full items-start justify-between gap-3" dir="ltr">
          <h2 className="text-left text-2xl font-bold text-white sm:text-5xl">
            {title}
          </h2>
          <span className="mt-1 shrink-0 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {label}
          </span>
        </div>
        <div
          className="mt-3 flex w-full items-center gap-2 text-sm text-text-secondary"
          dir="ltr"
        >
          {meta}
        </div>
        {description && (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary sm:mt-3 sm:line-clamp-3">
            {description}
          </p>
        )}
      </div>
      <div className="order-1 flex items-center justify-center sm:order-2">
        {card}
      </div>
    </div>
  );
}

function CoverStack({ previewGames }: { previewGames: Game[] }) {
  return (
    <div className="relative aspect-[4/3] w-44 overflow-hidden rounded-2xl border border-border bg-bg-secondary sm:w-72">
      <div className="flex h-full" aria-hidden>
        {Array.from({ length: STACK_SLOTS }).map((_, i) => {
          const game = previewGames[i];
          return (
            <div
              key={i}
              className={cn(
                "relative h-full bg-bg-secondary",
                i === 0
                  ? "flex-[1.6]"
                  : "-ml-4 flex-1 shadow-[-12px_0_20px_-8px_rgba(0,0,0,0.5)]",
              )}
            >
              {game?.cover_url && (
                <Image
                  src={game.cover_url}
                  alt=""
                  fill
                  sizes="290px"
                  className="object-cover"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
