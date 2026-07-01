import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase client for Server Components and Server Actions.
 *
 * Uses Clerk's native Third-Party Auth integration: the Clerk session token
 * (which carries the `role: authenticated` claim) is forwarded to Supabase via
 * `accessToken`, so RLS policies can match `auth.jwt() ->> 'sub'` against the
 * Clerk user id. No JWT template is used — that path is deprecated.
 */
export async function createSupabaseServerClient() {
  const { getToken } = await auth();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => (await getToken()) ?? null,
    },
  );
}
