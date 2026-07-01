import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { getProfileData } from "@/lib/profile/data";
import { ProfileView } from "@/components/profile/profile-view";
import { NewCollectionButton } from "@/components/collections/new-collection-button";

export const metadata: Metadata = { title: "الملف الشخصي | كويست" };

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { profile, userGames, reviews, ownedCollections, bookmarkedCollections } =
    await getProfileData(user.id, user.id);

  return (
    <ProfileView
      profile={profile}
      userGames={userGames}
      reviews={reviews}
      ownedCollections={ownedCollections}
      bookmarkedCollections={bookmarkedCollections}
      avatarUrl={user.imageUrl}
      fallbackInitial={profile?.display_name?.[0] ?? user.firstName?.[0] ?? "ك"}
      collectionsAction={<NewCollectionButton />}
    />
  );
}
