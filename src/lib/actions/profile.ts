"use server";

import type { AdminSupabase } from "@/lib/auth/admin";
import { assertNoDbError, UserFacingError, withAdmin, type ActionResult } from "@/lib/actions/result";
import { revalidatePortfolio } from "@/lib/actions/revalidate";
import { removeStoredFiles, verifyUploadedObject } from "@/lib/uploads/server";
import { profileSchema, resumeSchema } from "@/lib/validation/schemas";

async function loadProfile(supabase: AdminSupabase) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, avatar_path, resume_path")
    .limit(1)
    .maybeSingle();
  assertNoDbError(error, "load profile");
  if (!data) throw new UserFacingError("Profile row is missing. Run supabase/seed.sql.");
  return data as { id: string; avatar_path: string | null; resume_path: string | null };
}

export async function updateProfile(values: unknown): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const parsed = profileSchema.parse(values);
    const current = await loadProfile(supabase);
    if (parsed.avatar_path && parsed.avatar_path !== current.avatar_path) {
      await verifyUploadedObject(supabase, "avatar", parsed.avatar_path);
    }
    const { error } = await supabase.from("profiles").update(parsed).eq("id", current.id);
    assertNoDbError(error, "update profile");
    if (current.avatar_path && current.avatar_path !== parsed.avatar_path) {
      await removeStoredFiles(supabase, [{ kind: "avatar", path: current.avatar_path }]);
    }
    revalidatePortfolio();
    return null;
  }, "Profile saved");
}

export async function setResume(values: unknown): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const parsed = resumeSchema.parse(values);
    const path = parsed.resume_path!;
    const current = await loadProfile(supabase);
    if (path !== current.resume_path) await verifyUploadedObject(supabase, "resume", path);
    const { error } = await supabase
      .from("profiles")
      .update({
        resume_path: path,
        resume_file_name: parsed.resume_file_name,
        resume_updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);
    assertNoDbError(error, "update resume");
    if (current.resume_path && current.resume_path !== path) {
      await removeStoredFiles(supabase, [{ kind: "resume", path: current.resume_path }]);
    }
    revalidatePortfolio();
    return null;
  }, "Resume published");
}

export async function removeResume(): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const current = await loadProfile(supabase);
    const { error } = await supabase
      .from("profiles")
      .update({ resume_path: null, resume_file_name: null, resume_updated_at: null })
      .eq("id", current.id);
    assertNoDbError(error, "remove resume");
    if (current.resume_path) await removeStoredFiles(supabase, [{ kind: "resume", path: current.resume_path }]);
    revalidatePortfolio();
    return null;
  }, "Resume removed");
}

const socialLinksSchema = profileSchema.pick({
  github_url: true,
  linkedin_url: true,
  leetcode_url: true,
  codechef_url: true,
  website_url: true,
});

export async function updateSocialLinks(values: unknown): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    const parsed = socialLinksSchema.parse(values);
    const current = await loadProfile(supabase);
    const { error } = await supabase.from("profiles").update(parsed).eq("id", current.id);
    assertNoDbError(error, "update social links");
    revalidatePortfolio();
    return null;
  }, "Social links saved");
}
