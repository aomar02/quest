"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { REVIEW_BODY_MAX, isValidRating } from "@/lib/reviews/shared";

export type ReviewActionResult =
  | { ok: true }
  | { ok: false; error: string };

type ReviewInput = {
  igdbId: number;
  rating: number;
  body: string;
};

function revalidateReviewSurfaces(igdbId: number) {
  // The game page (list + count), the viewer's profile (their reviews list +
  // count) and the homepage "recent reviews" rail all change on any write.
  revalidatePath(`/games/${igdbId}`);
  revalidatePath("/profile");
  revalidatePath("/");
}

/**
 * Creates or updates the caller's review of a game. There is at most one review
 * per (user, game) — enforced by a unique index — so this upserts on conflict.
 * RLS guarantees the row's user_id is the caller's, so an attacker can't write
 * a review as someone else even by calling the action directly.
 */
export async function upsertReview(
  input: ReviewInput,
): Promise<ReviewActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  if (!Number.isInteger(input.igdbId)) {
    return { ok: false, error: "لعبة غير صالحة" };
  }
  if (!isValidRating(input.rating)) {
    return { ok: false, error: "التقييم يجب أن يكون بين ٠.٥ و ٥ نجوم" };
  }

  const body = input.body.trim();
  if (body.length > REVIEW_BODY_MAX) {
    return { ok: false, error: `المراجعة يجب ألا تتجاوز ${REVIEW_BODY_MAX} حرف` };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("reviews").upsert(
    {
      user_id: userId,
      igdb_id: input.igdbId,
      rating: input.rating,
      body: body || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,igdb_id" },
  );

  if (error) return { ok: false, error: "تعذر حفظ التقييم، حاول مرة أخرى" };

  revalidateReviewSurfaces(input.igdbId);
  return { ok: true };
}

/**
 * Deletes the caller's review of a game. RLS limits the delete to the caller's
 * own row, so an unowned igdb_id simply matches nothing.
 */
export async function deleteReview(igdbId: number): Promise<ReviewActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("user_id", userId)
    .eq("igdb_id", igdbId);

  if (error) return { ok: false, error: "تعذر حذف التقييم" };

  revalidateReviewSurfaces(igdbId);
  return { ok: true };
}
