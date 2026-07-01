"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLibraryStatus, type LibraryStatus } from "@/lib/user-games/shared";

export type UserGameActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateLibrarySurfaces(igdbId: number) {
  // The game page (the viewer's button + "Total Played" stat) and the profile
  // (completed-games section + stats) both reflect any status change.
  revalidatePath(`/games/${igdbId}`);
  revalidatePath("/profile");
}

/**
 * Adds the game to the caller's profile, or updates its status if already
 * there. At most one row per (user, game) — enforced by a unique index — so we
 * upsert on conflict. RLS guarantees the row's user_id is the caller's, so the
 * action can't write a status on someone else's behalf even if called directly.
 */
export async function setGameStatus(
  igdbId: number,
  status: LibraryStatus,
): Promise<UserGameActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  if (!Number.isInteger(igdbId)) {
    return { ok: false, error: "لعبة غير صالحة" };
  }
  if (!isLibraryStatus(status)) {
    return { ok: false, error: "حالة غير صالحة" };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_games").upsert(
    {
      user_id: userId,
      igdb_id: igdbId,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,igdb_id" },
  );

  if (error) return { ok: false, error: "تعذر حفظ الحالة، حاول مرة أخرى" };

  revalidateLibrarySurfaces(igdbId);
  return { ok: true };
}

/**
 * Removes the game from the caller's profile. RLS limits the delete to the
 * caller's own row, so an unowned igdb_id simply matches nothing.
 */
export async function removeGameStatus(
  igdbId: number,
): Promise<UserGameActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("user_games")
    .delete()
    .eq("user_id", userId)
    .eq("igdb_id", igdbId);

  if (error) return { ok: false, error: "تعذر إزالة اللعبة" };

  revalidateLibrarySurfaces(igdbId);
  return { ok: true };
}
