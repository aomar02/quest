"use server";

import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompleteProfileState = {
  error?: string;
  fieldErrors?: {
    displayName?: string;
    bio?: string;
  };
};

const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 160;

export async function completeProfile(
  _prevState: CompleteProfileState,
  formData: FormData,
): Promise<CompleteProfileState> {
  const { userId } = await auth();
  if (!userId) {
    return { error: "يجب تسجيل الدخول أولاً" };
  }

  const user = await currentUser();
  if (!user) {
    return { error: "تعذر تحميل بيانات المستخدم" };
  }

  // Username is owned by Clerk and required at sign-up; we mirror it into Supabase.
  if (!user.username) {
    return { error: "يرجى تعيين اسم مستخدم في حسابك أولاً" };
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const fieldErrors: NonNullable<CompleteProfileState["fieldErrors"]> = {};
  if (!displayName) {
    fieldErrors.displayName = "الاسم المعروض مطلوب";
  } else if (displayName.length > DISPLAY_NAME_MAX) {
    fieldErrors.displayName = `الاسم المعروض يجب ألا يتجاوز ${DISPLAY_NAME_MAX} حرفاً`;
  }
  if (bio.length > BIO_MAX) {
    fieldErrors.bio = `النبذة يجب ألا تتجاوز ${BIO_MAX} حرفاً`;
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      username: user.username,
      display_name: displayName,
      bio: bio || null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { error: "تعذر حفظ الملف الشخصي، حاول مرة أخرى" };
  }

  // Gate flag read by the (protected) layout — avoids a DB hit on every request.
  const clerk = await clerkClient();
  await clerk.users.updateUser(user.id, {
    publicMetadata: { ...user.publicMetadata, onboardingComplete: true },
  });

  redirect("/");
}
