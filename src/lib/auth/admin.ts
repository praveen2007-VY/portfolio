import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type AdminSession =
  | { status: "ok"; supabase: AdminSupabase; user: User }
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string | null }
  | { status: "unconfigured" };

export class AuthorizationError extends Error {
  constructor(message = "You are not authorized to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Verifies the session with Supabase Auth (getUser() validates the JWT
 * server-side) and checks the admin allowlist through is_admin(), which reads
 * public.admin_users — a table users cannot write to.
 */
export async function getAdminSession(): Promise<AdminSession> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { status: "unauthenticated" };

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) return { status: "forbidden", email: user.email ?? null };

  return { status: "ok", supabase, user };
}

/** For Server Actions and Route Handlers. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (session.status !== "ok") {
    throw new AuthorizationError(
      session.status === "unconfigured"
        ? "Supabase is not configured."
        : "You must be signed in as an administrator.",
    );
  }
  return session;
}

/** For protected pages and layouts. */
export async function requireAdminPage(next?: string) {
  const session = await getAdminSession();
  if (session.status === "ok") return session;
  if (session.status === "forbidden") redirect("/admin/login?error=forbidden");
  if (session.status === "unconfigured") redirect("/admin/login");
  redirect(next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login");
}

/** Only allow redirects to admin pages after login (no open redirects). */
export function safeAdminRedirect(next: unknown): string {
  if (typeof next !== "string") return "/admin";
  if (!/^\/admin(\/[A-Za-z0-9\-/]*)?$/.test(next) || next.startsWith("/admin/login")) return "/admin";
  return next;
}
