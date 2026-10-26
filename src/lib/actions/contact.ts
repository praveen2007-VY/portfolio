"use server";

import { headers } from "next/headers";
import { toFieldErrors, type ActionResult } from "@/lib/actions/result";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { contactSchema } from "@/lib/validation/schemas";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const MIN_FILL_MS = 2500;
// Best-effort per-instance limiter. The database also enforces a global limit
// (contact_messages_rate_limit trigger) that holds across instances.
const recent = new Map<string, number[]>();

function rateLimited(key: string, now: number) {
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear();
  return false;
}

export async function submitContact(
  values: unknown,
  startedAt: number,
): Promise<ActionResult<null>> {
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    // A filled honeypot means a bot: answer like a success, store nothing.
    if (parsed.error.issues.some((i) => i.path[0] === "website")) return { ok: true, data: null };
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const now = Date.now();
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS) {
    return { ok: false, error: "That was quick! Please take a moment and try again." };
  }

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
  if (rateLimited(ip, now)) {
    return { ok: false, error: "You've sent several messages recently. Please try again later." };
  }

  const supabase = createSupabasePublicClient();
  if (!supabase) return { ok: false, error: "The contact form is not available right now. Please use email." };

  const { name, email, message } = parsed.data;
  const { error } = await supabase.from("contact_messages").insert({ name, email, message });
  if (error) {
    console.error("[contact] insert failed:", error);
    return {
      ok: false,
      error:
        error.code === "P0001"
          ? "We're receiving a lot of messages right now. Please try again later or use email."
          : "Your message could not be sent. Please try again or use email.",
    };
  }
  return { ok: true, data: null, message: "Thanks! Your message has been received." };
}
