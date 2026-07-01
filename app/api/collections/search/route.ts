import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { searchCollections } from "@/lib/collections/data";

// Reads the request URL and the viewer's auth state, so it must run per
// request rather than be prerendered.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const query = params.get("q") ?? "";
  const offset = Number(params.get("offset") ?? "0") || 0;

  try {
    const { collections, hasMore } = await searchCollections(userId, {
      query,
      offset,
    });
    return Response.json({ collections, hasMore });
  } catch (error) {
    console.error("Collection search failed:", error);
    return Response.json(
      { error: "تعذر البحث عن المجموعات، حاول مرة أخرى." },
      { status: 502 },
    );
  }
}
