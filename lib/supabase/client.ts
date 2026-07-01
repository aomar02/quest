"use client";

import { useMemo } from "react";
import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase client for Client Components, authenticated with the current Clerk
 * session via Clerk's native Third-Party Auth integration. Forwards the Clerk
 * session token to Supabase so RLS policies keyed on `auth.jwt() ->> 'sub'`
 * apply. Intended for client-side reads/writes (e.g. future profile pages).
 */
export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(
    () =>
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          accessToken: async () => (await session?.getToken()) ?? null,
        },
      ),
    [session],
  );
}
