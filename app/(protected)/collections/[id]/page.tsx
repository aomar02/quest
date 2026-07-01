import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { getCollection } from "@/lib/collections/data";
import { getComments } from "@/lib/social/data";
import { GameCard } from "@/components/games/game-card";
import { BookmarkButton } from "@/components/collections/bookmark-button";
import { CollectionOwnerActions } from "@/components/collections/collection-owner-actions";
import { LikeButton } from "@/components/social/like-button";
import { CommentThread } from "@/components/social/comment-thread";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { userId } = await auth();
  if (!userId) return { title: "كويست" };
  const collection = await getCollection((await params).id, userId);
  return { title: collection ? `${collection.name} | كويست` : "كويست" };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const collection = await getCollection((await params).id, userId);
  if (!collection) notFound();

  const comments = await getComments({ collectionId: collection.id }, userId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-text-primary">
            {collection.name}
          </h1>
          {collection.author && (
            <p className="mt-1 text-sm text-text-muted">
              بواسطة{" "}
              <Link
                href={`/profile/${collection.author.username}`}
                className="text-text-secondary hover:text-text-primary hover:underline"
              >
                {collection.author.display_name} · @{collection.author.username}
              </Link>
            </p>
          )}
          {collection.description && (
            <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">
              {collection.description}
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 text-sm text-text-muted">
            <span>{collection.games.length} لعبة</span>
            <span>·</span>
            <span>{collection.bookmarkCount} حفظ</span>
            <span>·</span>
            <LikeButton
              target={{ collectionId: collection.id }}
              initialLiked={collection.isLiked}
              initialCount={collection.like_count}
              iconClassName="size-4"
            />
            <span>{collection.comment_count} تعليق</span>
          </div>
        </div>

        <div className="shrink-0">
          {collection.isOwner ? (
            <CollectionOwnerActions
              collection={{
                id: collection.id,
                name: collection.name,
                description: collection.description,
                games: collection.games.map((game) => ({
                  igdb_id: game.igdb_id,
                  title: game.title,
                  cover_url: game.cover_url,
                })),
              }}
            />
          ) : (
            <BookmarkButton
              collectionId={collection.id}
              initialBookmarked={collection.isBookmarked}
              withLabel
            />
          )}
        </div>
      </div>

      {collection.games.length === 0 ? (
        <p className="mt-10 text-text-muted">لا توجد ألعاب في هذه المجموعة بعد.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
          {collection.games.map((game) => (
            <GameCard key={game.igdb_id} game={game} />
          ))}
        </div>
      )}

      <section dir="rtl" className="mx-auto mt-12 max-w-3xl border-t border-border pt-8">
        <CommentThread
          target={{ collectionId: collection.id }}
          initialComments={comments}
        />
      </section>
    </div>
  );
}
