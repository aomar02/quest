"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

/**
 * Removes a user entirely: their Supabase profile (which cascades to every
 * collection/review/comment/like/bookmark/notification they own, via the
 * existing `ON DELETE CASCADE` FKs) and their Clerk account. The profile is
 * deleted first — if the Clerk deletion then fails, the admin can simply
 * retry it; the reverse order would risk a signed-out account with orphaned
 * Supabase rows nobody can clean up through the UI.
 */
export async function adminDeleteUser(userId: string): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
  if (error) return { ok: false, error: "تعذر حذف بيانات المستخدم" };

  const clerk = await clerkClient();
  try {
    await clerk.users.deleteUser(userId);
  } catch {
    return { ok: false, error: "تم حذف بيانات المستخدم لكن تعذر حذف الحساب" };
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function adminDeleteCollection(id: string): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const { data: memberRows } = await supabase
    .from("collection_games")
    .select("igdb_id")
    .eq("collection_id", id);

  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذر حذف المجموعة" };

  revalidatePath("/admin/collections");
  revalidatePath(`/collections/${id}`);
  for (const row of memberRows ?? []) {
    revalidatePath(`/games/${row.igdb_id}`);
  }
  return { ok: true };
}

export async function adminDeleteReview(id: string, igdbId: number): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: "تعذر حذف التقييم" };

  revalidatePath("/admin/reviews");
  revalidatePath(`/games/${igdbId}`);
  return { ok: true };
}

/**
 * Soft-deletes a comment the same way `deleteComment` (`app/(protected)/social/actions.ts`)
 * does for the comment's own author: clears the body and sets `deleted_at` so
 * replies underneath aren't orphaned, just without the ownership filter.
 */
export async function adminDeleteComment(id: string): Promise<AdminActionResult> {
  await requireAdmin();

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("comments")
    .update({ body: "", deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "تعذر حذف التعليق" };

  revalidatePath("/admin/comments");
  return { ok: true };
}
