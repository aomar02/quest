import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { after } from "next/server";
import { Star } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPlatformLogos, fetchGameDescriptionById } from "@/lib/igdb/client";
import { translateDescriptionsToArabic } from "@/lib/translate/description";
import { GENRE_TRANSLATIONS } from "@/lib/discover-filters";
import { getCollectionCountForGame } from "@/lib/collections/data";
import { getGameReviews, getViewerReview } from "@/lib/reviews/data";
import {
  getViewerGameStatus,
  getPlayedCountForGame,
  getGameStatusesForUsers,
} from "@/lib/user-games/data";
import { getGameScreenshots } from "@/lib/games/screenshots";
import { AddToCollectionButton } from "@/components/collections/add-to-collection-button";
import { AddToProfileButton } from "@/components/user-games/add-to-profile-button";
import { RateButton } from "@/components/reviews/rate-button";
import { ReviewItem } from "@/components/reviews/review-item";
import { ScreenshotGallery } from "@/components/games/screenshot-gallery";

const getGame = cache(async (igdbId: number) => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("igdb_id", igdbId)
    .maybeSingle();

  if (error) throw error;
  return data;
});

function parseIgdbId(id: string): number | null {
  const igdbId = Number(id);
  return Number.isInteger(igdbId) ? igdbId : null;
}

function formatReleaseDate(releaseDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(releaseDate));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const igdbId = parseIgdbId((await params).id);
  const game = igdbId ? await getGame(igdbId) : null;
  return { title: game ? `${game.title} | كويست` : "كويست" };
}

const STAT_META = [
  { key: "played", label: "لاعب ختمها" },
  { key: "collections", label: "مجموع المكتبات" },
  { key: "reviews", label: "مجموع التقييمات" },
] as const;

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const igdbId = parseIgdbId((await params).id);
  const game = igdbId ? await getGame(igdbId) : null;

  if (!game) notFound();

  if (!game.description) {
    after(async () => {
      try {
        const englishDescription = await fetchGameDescriptionById(game.igdb_id);
        if (!englishDescription) return;
        const [arabic] = await translateDescriptionsToArabic([englishDescription]);
        const bg = createSupabaseAdminClient();
        await bg.from("games").update({ description: arabic }).eq("igdb_id", game.igdb_id);
      } catch (err) {
        console.error("Description backfill failed for game", game.igdb_id, err);
      }
    });
  }

  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [
    platformLogos,
    collectionCount,
    gameReviews,
    viewerReview,
    viewerStatus,
    playedCount,
    screenshots,
  ] = await Promise.all([
    getPlatformLogos(game.platforms),
    getCollectionCountForGame(game.igdb_id),
    getGameReviews(game.igdb_id, userId),
    getViewerReview(game.igdb_id, userId),
    getViewerGameStatus(game.igdb_id, userId),
    getPlayedCountForGame(game.igdb_id),
    getGameScreenshots(game.igdb_id),
  ]);

  const statValues: Record<(typeof STAT_META)[number]["key"], number> = {
    collections: collectionCount,
    reviews: gameReviews.count,
    played: playedCount,
  };

  // Surface the viewer's own review first so they can find/edit it quickly.
  const sortedReviews = [
    ...gameReviews.reviews.filter((review) => review.user_id === userId),
    ...gameReviews.reviews.filter((review) => review.user_id !== userId),
  ];

  // Each reviewer's own library status for this game (e.g. "Completed"),
  // shown as a badge next to their rating.
  const reviewerStatuses = await getGameStatusesForUsers(
    game.igdb_id,
    sortedReviews.map((review) => review.user_id),
  );

  // Quest's own average rating, computed over the loaded reviews.
  const questAverage =
    gameReviews.reviews.length > 0
      ? gameReviews.reviews.reduce(
          (sum, review) => sum + Number(review.rating),
          0,
        ) / gameReviews.reviews.length
      : null;

  return (
    <div dir="ltr">
      <div className="relative h-[22vh] min-h-[150px] w-full overflow-hidden bg-bg-secondary sm:h-[28vh]">
        {game.banner_url && (
          <Image
            src={game.banner_url}
            alt=""
            fill
            preload
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Sidebar: cover + rating + actions */}
          <div className="mx-auto flex w-40 shrink-0 flex-col gap-3 sm:mx-0 lg:w-48">
            <div className="relative -mt-12 aspect-[3/4] overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-2xl shadow-black/50 sm:-mt-16">
              {game.cover_url && (
                <Image
                  src={game.cover_url}
                  alt={game.title}
                  fill
                  preload
                  sizes="(min-width: 1024px) 12rem, 10rem"
                  className="object-cover"
                />
              )}
            </div>

            <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-bg-elevated">
              <span className="bg-bg-secondary px-3 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Rating
              </span>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium tracking-wide text-text-muted">
                  IGDB
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  {game.rating != null ? `${game.rating}%` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium tracking-wide text-text-muted">
                  Quest
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {questAverage != null ? questAverage.toFixed(1) : "—"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <AddToProfileButton
                game={{
                  igdb_id: game.igdb_id,
                  title: game.title,
                  cover_url: game.cover_url,
                }}
                status={viewerStatus}
                review={viewerReview}
              />
              <RateButton
                game={{
                  igdb_id: game.igdb_id,
                  title: game.title,
                  cover_url: game.cover_url,
                }}
                review={viewerReview}
              />
              <AddToCollectionButton
                game={{
                  igdb_id: game.igdb_id,
                  title: game.title,
                  cover_url: game.cover_url,
                }}
              />
            </div>
          </div>

          {/* Main: title, meta, stats, platforms, description */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1">
            <div className="w-full">
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl lg:text-4xl">
                {game.title}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
                {game.publisher && <span>{game.publisher}</span>}
                {game.release_date && game.publisher && <span>·</span>}
                {game.release_date && (
                  <span>{formatReleaseDate(game.release_date)}</span>
                )}
              </div>
            </div>

            <div className="flex justify-center gap-6 sm:justify-end">
              {STAT_META.map(({ key, label }) => (
                <div key={key} dir="rtl" className="flex flex-col items-center gap-0.5">
                  <span className="text-4xl font-black tabular-nums text-text-primary sm:text-5xl">
                    {String(statValues[key]).padStart(3, "0")}
                  </span>
                  <span className="text-xs font-medium text-text-muted">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Genres */}
            {game.genres.length > 0 && (
              <div dir="rtl" className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  التصنيفات
                </span>
                <div className="flex flex-wrap gap-2">
                  {game.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary"
                    >
                      {GENRE_TRANSLATIONS[genre] ?? genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Platforms */}
            {game.platforms.length > 0 && (
              <div dir="rtl" className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  المنصات
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {game.platforms.map((platform) => {
                    const logo = platformLogos.get(platform);
                    return (
                      <div
                        key={platform}
                        title={platform}
                        className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-3 shadow-sm"
                      >
                        {logo && (
                          <Image
                            src={logo}
                            alt=""
                            width={16}
                            height={16}
                            className="size-4 object-contain"
                          />
                        )}
                        <span className="text-xs font-medium text-text-secondary">
                          {platform}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {game.description && (
              <p
                className="leading-relaxed text-right text-text-secondary"
                dir="rtl"
              >
                {game.description}
              </p>
            )}
          </div>
        </div>

        {/* Screenshots */}
        {screenshots.length > 0 && (
          <section className="mt-10">
            <h2
              dir="rtl"
              className="mb-3 text-xl font-semibold text-text-primary"
            >
              لقطات اللعبة
            </h2>
            <ScreenshotGallery screenshots={screenshots} />
          </section>
        )}

        {/* Reviews */}
        <section dir="rtl" className="mt-10">
          <h2 className="text-xl font-semibold text-text-primary">
            المراجعات{" "}
            <span className="text-text-muted">({gameReviews.count})</span>
          </h2>

          {sortedReviews.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4">
              {sortedReviews.map((review) => (
                <ReviewItem
                  key={review.id}
                  review={review}
                  reviewerStatus={reviewerStatuses.get(review.user_id) ?? null}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-text-muted">
              لا توجد مراجعات بعد. كن أول من يقيّم هذه اللعبة.
            </p>
          )}
        </section>

        <div className="h-10 sm:h-16" />
      </div>
    </div>
  );
}
