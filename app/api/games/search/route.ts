import type { NextRequest } from "next/server";

import { searchGamesCached } from "@/lib/games/cache";

// Reads the request URL and authenticated Supabase client, so it must run per
// request rather than be prerendered.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  // Require a couple of characters before spending an IGDB call.
  if (query.length < 2) {
    return Response.json({ games: [] });
  }

  try {
    const games = await searchGamesCached(query);
    return Response.json({ games });
  } catch (error) {
    console.error("Game search failed:", error);
    return Response.json(
      { error: "تعذر البحث عن الألعاب، حاول مرة أخرى." },
      { status: 502 },
    );
  }
}
