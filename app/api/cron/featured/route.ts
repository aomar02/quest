import type { NextRequest } from "next/server";

import { refreshFeatured } from "@/lib/featured/data";

// Triggered by Vercel Cron every 24h (see vercel.json) rather than rendered,
// so it must run fully dynamically.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` to cron
  // invocations when a CRON_SECRET env var is configured on the project.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await refreshFeatured();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Featured carousel refresh failed:", error);
    return Response.json({ ok: false }, { status: 502 });
  }
}
