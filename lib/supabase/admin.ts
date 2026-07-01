import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role Supabase client for trusted server-only contexts: either ones
 * that run outside a Clerk session (e.g. the scheduled featured-carousel refresh)
 * and can't authenticate via the usual accessToken bridge, or the admin
 * dashboard (`app/(protected)/admin`), which is gated by `requireAdmin()` and
 * intentionally needs to see/manage every user's data. Bypasses RLS — never
 * import this from a route that handles ordinary end-user requests.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
