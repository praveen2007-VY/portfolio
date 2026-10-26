import "server-only";
import { z } from "zod";
import { AuthorizationError, requireAdmin } from "@/lib/auth/admin";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export class UserFacingError extends Error {}

type PostgrestLikeError = { code?: string; message?: string; details?: string };

function describeDatabaseError(error: PostgrestLikeError): string {
  switch (error.code) {
    case "23505":
      return "An entry with the same unique value already exists (for example the slug or name).";
    case "23514":
      return "Some values were rejected by the database validation rules.";
    case "42501":
      return "The database rejected this change: you are not authorized.";
    case "P0001":
      return error.message ?? "The request was rejected.";
    default:
      return "The database could not save this change. Please try again.";
  }
}

/** Throws a user-facing error for a failed Supabase response. */
export function assertNoDbError(error: PostgrestLikeError | null, context: string) {
  if (!error) return;
  console.error(`[db] ${context}:`, error);
  throw new UserFacingError(describeDatabaseError(error));
}

export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: toFieldErrors(error) };
  }
  if (error instanceof UserFacingError) return { ok: false, error: error.message };
  console.error("[action] unexpected error:", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Wraps an admin Server Action: authorization first, uniform error handling. */
export async function withAdmin<T>(
  fn: (session: Awaited<ReturnType<typeof requireAdmin>>) => Promise<T>,
  message?: string,
): Promise<ActionResult<T>> {
  try {
    const session = await requireAdmin();
    const data = await fn(session);
    return { ok: true, data, message };
  } catch (error) {
    return toActionError(error);
  }
}
