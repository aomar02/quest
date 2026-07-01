import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EditProfileForm } from "@/components/profile/edit-profile-form";

export const metadata: Metadata = { title: "تعديل الملف الشخصي | كويست" };

export default async function EditProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, username")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/profile"
          className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowRight className="size-4 rtl:rotate-0" />
          الملف الشخصي
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-sm font-medium">تعديل</span>
      </div>

      <h1 className="mb-8 text-2xl font-bold">تعديل الملف الشخصي</h1>

      <EditProfileForm
        avatarUrl={user.imageUrl}
        fallbackInitial={profile?.display_name?.[0] ?? user.firstName?.[0] ?? "ك"}
        currentDisplayName={profile?.display_name ?? ""}
        currentBio={profile?.bio ?? ""}
        username={profile?.username ?? ""}
      />
    </div>
  );
}
