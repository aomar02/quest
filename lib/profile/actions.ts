"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DISPLAY_NAME_MAX = 50;
const BIO_MAX = 160;

export type UpdateProfileState = {
  error?: string;
  fieldErrors?: {
    displayName?: string;
    bio?: string;
  };
};

export async function updateProfile(
  _prevState: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const { userId } = await auth();
  if (!userId) return { error: "يجب تسجيل الدخول أولاً" };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const fieldErrors: NonNullable<UpdateProfileState["fieldErrors"]> = {};
  if (!displayName) {
    fieldErrors.displayName = "الاسم المعروض مطلوب";
  } else if (displayName.length > DISPLAY_NAME_MAX) {
    fieldErrors.displayName = `الاسم المعروض يجب ألا يتجاوز ${DISPLAY_NAME_MAX} حرفاً`;
  }
  if (bio.length > BIO_MAX) {
    fieldErrors.bio = `النبذة يجب ألا تتجاوز ${BIO_MAX} حرفاً`;
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, bio: bio || null })
    .eq("user_id", userId);

  if (error) return { error: "تعذر حفظ التغييرات، حاول مرة أخرى" };

  revalidatePath("/profile");
  redirect("/profile");
}

export type DeleteAccountState = { error?: string };

export async function deleteAccount(
  _prevState: DeleteAccountState,
  _formData: FormData,
): Promise<DeleteAccountState> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
  } catch {
    return { error: "تعذر حذف الحساب، حاول مرة أخرى" };
  }

  redirect("/sign-in");
}
