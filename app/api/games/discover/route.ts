import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRecentGames } from "@/lib/games/discover";
import type { PeriodValue } from "@/lib/discover-filters";

export const dynamic = "force-dynamic";

const VALID_PERIODS = new Set<PeriodValue>(["year", "3y", "5y"]);

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const platform = sp.has("platform") ? Number(sp.get("platform")) : undefined;
  const genre = sp.has("genre") ? Number(sp.get("genre")) : undefined;
  const rawPeriod = sp.get("period");
  const period =
    rawPeriod && VALID_PERIODS.has(rawPeriod as PeriodValue)
      ? (rawPeriod as PeriodValue)
      : undefined;
  const offset = Math.max(0, Number(sp.get("offset") ?? 0) || 0);

  try {
    const { games, hasMore } = await getRecentGames({
      platform,
      genre,
      period,
      offset,
    });
    return Response.json({ games, hasMore });
  } catch (error) {
    console.error("Discover games failed:", error);
    return Response.json(
      { error: "تعذر تحميل الألعاب، حاول مرة أخرى." },
      { status: 502 },
    );
  }
}
