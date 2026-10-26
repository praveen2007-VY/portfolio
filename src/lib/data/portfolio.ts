import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFallbackPortfolio } from "@/lib/data/fallback";
import {
  normalizeSettings,
  toPublicAchievement,
  toPublicCertificate,
  toPublicProfile,
  toPublicProject,
  withAvatar,
} from "@/lib/data/normalize";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import type {
  AchievementRow,
  CertificateRow,
  CodingProfileRow,
  EducationRow,
  ExperienceRow,
  PortfolioData,
  ProfileRow,
  ProjectRow,
  PublicProfile,
  SiteSettingsRow,
  SkillRow,
} from "@/types/portfolio";

export const PORTFOLIO_TAG = "portfolio";

type Mode = "published" | "preview";

function unwrap<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`Failed to load ${what}: ${result.error.message}`);
  return (result.data ?? []) as T;
}

async function loadPortfolio(client: SupabaseClient, mode: Mode): Promise<PortfolioData> {
  const list = <T>(table: string) => {
    let query = client.from(table).select("*");
    // RLS already hides drafts from visitors; the explicit filter keeps drafts
    // out of the public payload even for a signed-in admin.
    if (mode === "published") query = query.eq("is_published", true);
    return query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then((r) => unwrap<T[]>(r, table));
  };

  const profilePromise =
    mode === "published"
      ? client.rpc("get_public_profile").then((r) => unwrap<PublicProfile[]>(r, "profile")[0] ?? null)
      : client
          .from("profiles")
          .select("*")
          .limit(1)
          .maybeSingle()
          .then((r) => {
            if (r.error) throw new Error(`Failed to load profile: ${r.error.message}`);
            return r.data ? toPublicProfile(r.data as ProfileRow) : null;
          });

  const settingsPromise = client
    .from("site_settings")
    .select("*")
    .eq("variant", mode === "published" ? "published" : "draft")
    .maybeSingle()
    .then((r) => {
      if (r.error) throw new Error(`Failed to load site settings: ${r.error.message}`);
      return (r.data as SiteSettingsRow | null) ?? null;
    });

  const [profile, settings, projects, certificates, achievements, codingProfiles, skills, experiences, education] =
    await Promise.all([
      profilePromise,
      settingsPromise,
      list<ProjectRow>("projects"),
      list<CertificateRow>("certificates"),
      list<AchievementRow>("achievements"),
      list<CodingProfileRow>("coding_profiles"),
      list<SkillRow>("skills"),
      list<ExperienceRow>("experiences"),
      list<EducationRow>("education"),
    ]);

  if (!profile) throw new Error("Profile row is missing. Run supabase/seed.sql.");

  return {
    source: "database",
    profile: withAvatar(profile),
    settings: normalizeSettings(settings),
    projects: projects.map(toPublicProject),
    certificates: certificates.map(toPublicCertificate),
    achievements: achievements.map(toPublicAchievement),
    codingProfiles,
    skills,
    experiences,
    education,
    contactEnabled: true,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Published portfolio content for the public site. Cached on the server and
 * invalidated with updateTag(PORTFOLIO_TAG) whenever the admin changes content.
 */
export async function getPublishedPortfolio(): Promise<PortfolioData> {
  "use cache";
  cacheTag(PORTFOLIO_TAG);

  const client = createSupabasePublicClient();
  if (!client) {
    cacheLife("hours");
    return buildFallbackPortfolio("fallback");
  }

  try {
    const data = await loadPortfolio(client, "published");
    cacheLife("hours");
    return data;
  } catch (error) {
    console.error("[portfolio] could not load published content:", error);
    // Keep the site usable during an outage and retry soon.
    cacheLife("minutes");
    return buildFallbackPortfolio("unavailable");
  }
}

/** Draft-inclusive content for the admin preview. Never cached. */
export async function getPreviewPortfolio(client: SupabaseClient): Promise<PortfolioData> {
  return loadPortfolio(client, "preview");
}
