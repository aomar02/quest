import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";

/**
 * Whether a Clerk user has been granted admin access. Set manually via
 * `publicMetadata: { role: "admin" }` in the Clerk dashboard — there is no
 * in-app way to grant this, intentionally.
 */
export function isAdmin(user: Pick<User, "publicMetadata"> | null): boolean {
  return user?.publicMetadata?.role === "admin";
}

/**
 * Guards an admin server action. 404s instead of redirecting so a non-admin
 * calling the action directly gets no hint that an admin surface exists.
 */
export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}
