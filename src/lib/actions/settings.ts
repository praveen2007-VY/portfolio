"use server";

import type { AdminSupabase } from "@/lib/auth/admin";
import { assertNoDbError, UserFacingError, withAdmin, type ActionResult } from "@/lib/actions/result";
import { refreshAdmin, revalidatePortfolio } from "@/lib/actions/revalidate";
import { settingsSchema } from "@/lib/validation/schemas";

const COLUMNS = [
  "hero_eyebrow",
  "hero_greeting",
  "hero_title",
  "hero_highlight",
  "hero_intro",
  "sections",
  "accent",
  "animation_level",
  "enable_3d",
  "coding_summary",
  "footer_text",
  "seo_title",
  "seo_description",
] as const;

/** Saves the draft settings. The public site is unchanged until published. */
export async function saveSettingsDraft(values: unknown): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const parsed = settingsSchema.parse(values);
    const { data, error } = await supabase
      .from("site_settings")
      .update(parsed)
      .eq("variant", "draft")
      .select("id");
    assertNoDbError(error, "save settings draft");
    if (!data?.length) throw new UserFacingError("Draft settings row is missing. Run supabase/seed.sql.");
    refreshAdmin();
    return null;
  }, "Draft saved");
}

async function copySettings(
  supabase: AdminSupabase,
  from: "draft" | "published",
  to: "draft" | "published",
) {
  const { data: source, error } = await supabase
    .from("site_settings")
    .select(COLUMNS.join(", "))
    .eq("variant", from)
    .maybeSingle();
  assertNoDbError(error, `load ${from} settings`);
  if (!source) throw new UserFacingError(`The ${from} settings row is missing. Run supabase/seed.sql.`);
  // Re-validate before anything reaches the public site.
  const parsed = settingsSchema.parse(source);
  const patch = to === "published" ? { ...parsed, published_at: new Date().toISOString() } : parsed;
  const { data, error: writeError } = await supabase
    .from("site_settings")
    .update(patch)
    .eq("variant", to)
    .select("id");
  assertNoDbError(writeError, `write ${to} settings`);
  if (!data?.length) throw new UserFacingError(`The ${to} settings row is missing. Run supabase/seed.sql.`);
}

export async function publishSettings(): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    await copySettings(supabase, "draft", "published");
    revalidatePortfolio();
    return null;
  }, "Settings published");
}

export async function discardSettingsDraft(): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    await copySettings(supabase, "published", "draft");
    refreshAdmin();
    return null;
  }, "Draft reset to the published settings");
}
