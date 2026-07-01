import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Deletes the mirrored profile row when Clerk deletes the underlying user.
// FK cascades from `profiles.user_id` clean up reviews/user_games/collections/
// collection_bookmarks, so this single delete is enough on the Supabase side.
export async function POST(request: NextRequest) {
  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return new Response("Webhook verification failed", { status: 400 });
  }

  if (event.type === "user.deleted") {
    const userId = event.data.id;
    if (userId) {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) {
        console.error("Failed to delete profile for deleted Clerk user:", error);
        return new Response("Failed to clean up profile", { status: 500 });
      }
    }
  }

  return new Response("OK", { status: 200 });
}
