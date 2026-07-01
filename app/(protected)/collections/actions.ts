"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Mirror the CHECK constraints on the collections table so we fail fast with a
// friendly message instead of surfacing a raw Postgres error.
const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;
// A collection can't realistically need more than this in one save, and it caps
// the size of a single mutation.
const MAX_GAMES = 200;

export type CollectionActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

type CollectionInput = {
  name: string;
  description: string;
  igdbIds: number[];
};

function validate(
  input: CollectionInput,
): { name: string; description: string | null; igdbIds: number[] } | string {
  const name = input.name.trim();
  const description = input.description.trim();
  const igdbIds = [...new Set(input.igdbIds)].filter((id) =>
    Number.isInteger(id),
  );

  if (!name) return "اسم المجموعة مطلوب";
  if (name.length > NAME_MAX) return `الاسم يجب ألا يتجاوز ${NAME_MAX} حرفاً`;
  if (description.length > DESCRIPTION_MAX) {
    return `الوصف يجب ألا يتجاوز ${DESCRIPTION_MAX} حرفاً`;
  }
  if (igdbIds.length > MAX_GAMES) return "عدد الألعاب كبير جداً";

  return { name, description: description || null, igdbIds };
}

export async function createCollection(
  input: CollectionInput,
): Promise<CollectionActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const validated = validate(input);
  if (typeof validated === "string") return { ok: false, error: validated };

  const supabase = await createSupabaseServerClient();

  const { data: collection, error } = await supabase
    .from("collections")
    .insert({
      user_id: userId,
      name: validated.name,
      description: validated.description,
    })
    .select("id")
    .single();

  if (error || !collection) {
    return { ok: false, error: "تعذر إنشاء المجموعة، حاول مرة أخرى" };
  }

  if (validated.igdbIds.length > 0) {
    const { error: gamesError } = await supabase.from("collection_games").insert(
      validated.igdbIds.map((igdb_id) => ({
        collection_id: collection.id,
        igdb_id,
      })),
    );
    if (gamesError) {
      // The collection exists but games failed — surface it so the user can retry.
      return { ok: false, error: "تعذر إضافة الألعاب إلى المجموعة" };
    }
  }

  revalidatePath("/profile");
  // Each added game's "Total Collection" stat just changed.
  for (const igdbId of validated.igdbIds) {
    revalidatePath(`/games/${igdbId}`);
  }
  return { ok: true, id: collection.id };
}

export async function updateCollection(
  id: string,
  input: CollectionInput,
): Promise<CollectionActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const validated = validate(input);
  if (typeof validated === "string") return { ok: false, error: validated };

  const supabase = await createSupabaseServerClient();

  // RLS limits the update to collections owned by the caller; an unowned id
  // simply matches no rows.
  const { data: updated, error } = await supabase
    .from("collections")
    .update({ name: validated.name, description: validated.description })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "تعذر حفظ التعديلات" };
  if (!updated) return { ok: false, error: "لا تملك صلاحية تعديل هذه المجموعة" };

  // Sync the game list: insert the newly added ids, delete the removed ones.
  const { data: existingRows, error: existingError } = await supabase
    .from("collection_games")
    .select("igdb_id")
    .eq("collection_id", id);
  if (existingError) return { ok: false, error: "تعذر تحديث الألعاب" };

  const existing = new Set((existingRows ?? []).map((row) => row.igdb_id));
  const desired = new Set(validated.igdbIds);

  const toAdd = validated.igdbIds.filter((igdbId) => !existing.has(igdbId));
  const toRemove = [...existing].filter((igdbId) => !desired.has(igdbId));

  if (toAdd.length > 0) {
    const { error: addError } = await supabase.from("collection_games").insert(
      toAdd.map((igdb_id) => ({ collection_id: id, igdb_id })),
    );
    if (addError) return { ok: false, error: "تعذر إضافة الألعاب" };
  }

  if (toRemove.length > 0) {
    const { error: removeError } = await supabase
      .from("collection_games")
      .delete()
      .eq("collection_id", id)
      .in("igdb_id", toRemove);
    if (removeError) return { ok: false, error: "تعذر إزالة الألعاب" };
  }

  revalidatePath("/profile");
  revalidatePath(`/collections/${id}`);
  // Only games whose membership actually changed have a stale stat.
  for (const igdbId of new Set([...toAdd, ...toRemove])) {
    revalidatePath(`/games/${igdbId}`);
  }
  return { ok: true, id };
}

export async function deleteCollection(id: string): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;

  const supabase = await createSupabaseServerClient();

  // Fetch the member games first so their "Total Collection" stat can be
  // revalidated after the cascade delete removes the join rows.
  const { data: memberRows } = await supabase
    .from("collection_games")
    .select("igdb_id")
    .eq("collection_id", id);

  // RLS ensures only the owner can delete; collection_games and bookmarks are
  // removed via ON DELETE CASCADE.
  await supabase.from("collections").delete().eq("id", id);

  revalidatePath("/profile");
  for (const row of memberRows ?? []) {
    revalidatePath(`/games/${row.igdb_id}`);
  }
  redirect("/profile");
}

export async function toggleBookmark(
  collectionId: string,
): Promise<{ ok: true; bookmarked: boolean } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "يجب تسجيل الدخول" };

  const supabase = await createSupabaseServerClient();

  const { data: existing, error: selectError } = await supabase
    .from("collection_bookmarks")
    .select("collection_id")
    .eq("user_id", userId)
    .eq("collection_id", collectionId)
    .maybeSingle();
  if (selectError) return { ok: false, error: "تعذر تحديث الحفظ" };

  if (existing) {
    const { error } = await supabase
      .from("collection_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("collection_id", collectionId);
    if (error) return { ok: false, error: "تعذر إزالة الحفظ" };

    revalidatePath("/profile");
    revalidatePath(`/collections/${collectionId}`);
    return { ok: true, bookmarked: false };
  }

  const { error } = await supabase
    .from("collection_bookmarks")
    .insert({ user_id: userId, collection_id: collectionId });
  if (error) return { ok: false, error: "تعذر حفظ المجموعة" };

  revalidatePath("/profile");
  revalidatePath(`/collections/${collectionId}`);
  return { ok: true, bookmarked: true };
}
