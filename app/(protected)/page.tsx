import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { getUpcomingGames } from "@/lib/games/home-rails";
import { getRecentCollections } from "@/lib/collections/data";
import { getRecentReviews } from "@/lib/reviews/data";
import { getFeaturedCarousel } from "@/lib/featured/data";
import { GameCard } from "@/components/games/game-card";
import { CollectionCard } from "@/components/collections/collection-card";
import { ReviewItem } from "@/components/reviews/review-item";
import { FeaturedCarousel } from "@/components/home/featured-carousel";
import type { Game } from "@/lib/games/cache";

function GameRail({
  title,
  games,
  emptyMessage,
  moreHref,
}: {
  title: string;
  games: Game[];
  emptyMessage: string;
  moreHref: string;
}) {
  return (
    <section className="mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
        <Link
          href={moreHref}
          className="text-sm font-medium text-primary hover:underline"
        >
          المزيد
        </Link>
      </div>
      {games.length > 0 ? (
        <div className="mt-6 flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 scrollbar-hide">
          {games.map((game) => (
            <div key={game.igdb_id} className="w-36 flex-none sm:w-44">
              <GameCard game={game} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-text-muted">{emptyMessage}</p>
      )}
    </section>
  );
}

export default async function Home() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [upcomingGames, collections, recentReviews, featured] =
    await Promise.all([
      getUpcomingGames(),
      getRecentCollections(userId),
      getRecentReviews(userId),
      getFeaturedCarousel(userId),
    ]);

  return (
    <div>
      <FeaturedCarousel slides={featured} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <GameRail
          title="قادم قريباً"
          games={upcomingGames}
          emptyMessage="لا توجد ألعاب قادمة حالياً."
          moreHref="/discover"
        />

        <section className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-text-primary">
              اخر المكتبات
            </h2>
            <Link
              href="/libraries"
              className="text-sm font-medium text-primary hover:underline"
            >
              عرض الكل
            </Link>
          </div>

          {collections.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-text-muted">لا توجد مكتبات حالياً.</p>
          )}
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-text-primary">
            آخر المراجعات
          </h2>

          {recentReviews.length > 0 ? (
            <div className="mt-6 flex flex-col gap-4">
              {recentReviews.map((review) => (
                <ReviewItem key={review.id} review={review} showGame />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-text-muted">لا توجد مراجعات حالياً.</p>
          )}
        </section>
      </div>
    </div>
  );
}
