"use server";

import { redirect } from "next/navigation";
import { safeAdminRedirect } from "@/lib/auth/admin";
import { toFieldErrors, type ActionResult } from "@/lib/actions/result";
import { isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/schemas";

export async function signIn(values: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }
  if (!isSupabaseConfigured()) return { ok: false, error: SUPABASE_SETUP_MESSAGE };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.status === 429) {
      return { ok: false, error: "Too many sign-in attempts. Please wait a few minutes and try again." };
    }
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "This email address has not been confirmed yet." };
    }
    // Same message for unknown email and wrong password.
    return { ok: false, error: "Invalid email or password." };
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account does not have administrator access." };
  }

  return { ok: true, data: { redirectTo: safeAdminRedirect(next) } };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
