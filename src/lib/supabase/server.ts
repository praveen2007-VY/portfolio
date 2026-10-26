import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig, SUPABASE_SETUP_MESSAGE } from "@/lib/env";

/**
 * Request-scoped client that carries the signed-in user's session from cookies.
 * Every query runs with the user's JWT, so RLS applies. Create one per request.
 */
export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error(SUPABASE_SETUP_MESSAGE);
  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session, so this can safely be ignored.
        }
      },
    },
  });
}
