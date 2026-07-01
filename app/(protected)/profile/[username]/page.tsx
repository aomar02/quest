import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

import { getProfileData, getUserIdByUsername } from "@/lib/profile/data";
import { ProfileView } from "@/components/profile/profile-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} | كويست` };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const viewer = await currentUser();
  if (!viewer) redirect("/sign-in");

  const profileUserId = await getUserIdByUsername(username);
  if (!profileUserId) notFound();

  // Keep a single canonical URL for the viewer's own profile.
  if (profileUserId === viewer.id) redirect("/profile");

  const { profile, userGames, reviews, ownedCollections, bookmarkedCollections } =
    await getProfileData(profileUserId, viewer.id);
  if (!profile) notFound();

  const clerk = await clerkClient();
  const profileUser = await clerk.users.getUser(profileUserId);

  return (
    <ProfileView
      profile={profile}
      userGames={userGames}
      reviews={reviews}
      ownedCollections={ownedCollections}
      bookmarkedCollections={bookmarkedCollections}
      avatarUrl={profileUser.imageUrl}
      fallbackInitial={profile.display_name?.[0] ?? "ك"}
    />
  );
}
