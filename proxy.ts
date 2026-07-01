import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);
// Hit by Vercel Cron with no Clerk session — it authenticates via its own
// bearer secret (see app/api/cron/featured/route.ts), so it must skip
// the Clerk redirect entirely rather than be treated as a public page.
const isCronRoute = createRouteMatcher(["/api/cron(.*)"]);
// Hit by Clerk's servers with no end-user session — it authenticates via
// Svix signature verification inside the route itself (see
// app/api/webhooks/clerk/route.ts), so it must also skip the redirect.
const isWebhookRoute = createRouteMatcher(["/api/webhooks(.*)"]);

export const proxy = clerkMiddleware(async (auth, req) => {
  if (isCronRoute(req) || isWebhookRoute(req)) return;

  const { userId } = await auth();

  if (!userId && !isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (userId && isPublicRoute(req)) {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
