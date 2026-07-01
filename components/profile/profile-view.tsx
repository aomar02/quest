import { Box, Gamepad2, Star } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileStat } from "@/components/profile/profile-stat";
import { ExpandableSection } from "@/components/profile/expandable-section";
import { CompletedGamesSection } from "@/components/profile/completed-games-section";
import { ReviewCard } from "@/components/profile/review-card";
import { CollectionCard } from "@/components/collections/collection-card";
import type { ProfileData } from "@/lib/profile/data";

/**
 * Shared profile body for both the viewer's own `/profile` and a public
 * `/profile/[username]` page — only the avatar, fallback initial, and the
 * action slot next to "المجموعات" (e.g. "New collection") differ.
 */
export function ProfileView({
  profile,
  userGames,
  reviews,
  ownedCollections,
  bookmarkedCollections,
  avatarUrl,
  fallbackInitial,
  collectionsAction,
}: {
  profile: ProfileData["profile"];
  userGames: ProfileData["userGames"];
  reviews: ProfileData["reviews"];
  ownedCollections: ProfileData["ownedCollections"];
  bookmarkedCollections: ProfileData["bookmarkedCollections"];
  avatarUrl: string;
  fallbackInitial: string;
  collectionsAction?: React.ReactNode;
}) {
  // Own collections first, then bookmarked (rendered with a tinted card).
  // Drop any bookmarked collection the profile owner also owns to avoid duplicates.
  const ownedIds = new Set(ownedCollections.map((collection) => collection.id));
  const collections = [
    ...ownedCollections,
    ...bookmarkedCollections.filter(
      (collection) => !ownedIds.has(collection.id),
    ),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-start">
        <Avatar className="size-20 sm:size-24">
          <AvatarImage src={avatarUrl} alt={profile?.display_name ?? ""} />
          <AvatarFallback className="text-2xl">{fallbackInitial}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col items-center gap-1 sm:items-start">
          <h1 className="text-2xl font-bold text-text-primary">
            {profile?.display_name ?? fallbackInitial}
          </h1>
          {profile?.username && (
            <p className="text-sm text-text-muted">@{profile.username}</p>
          )}
          {profile?.bio && (
            <p className="mt-1 max-w-md text-sm text-text-secondary">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <ProfileStat
            icon={Gamepad2}
            value={userGames.filter((g) => g.status === "completed").length}
            label="ألعاب مكتملة"
          />
          <ProfileStat icon={Star} value={reviews.length} label="تقييمات" />
          <ProfileStat
            icon={Box}
            value={ownedCollections.length}
            label="مجموعات"
          />
        </div>
      </div>

      <CompletedGamesSection games={userGames} />

      <ExpandableSection
        title="التقييمات"
        items={reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
        emptyText="لم تكتب أي تقييمات بعد."
        columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      />

      <ExpandableSection
        title="المجموعات"
        action={collectionsAction}
        items={collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
        emptyText="لا توجد مجموعات بعد."
        columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      />
    </div>
  );
}
