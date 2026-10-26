import { seedSections, seedSettings } from "@/lib/content/resume";
import { mediaUrl } from "@/lib/supabase/storage";
import {
  SECTION_KEYS,
  type AchievementRow,
  type CertificateRow,
  type PortfolioData,
  type ProfileRow,
  type ProjectRow,
  type PublicAchievement,
  type PublicCertificate,
  type PublicProfile,
  type PublicProject,
  type SectionsConfig,
  type SiteSettingsRow,
} from "@/types/portfolio";

export function normalizeSections(raw: SiteSettingsRow["sections"] | null | undefined): SectionsConfig {
  const out = {} as SectionsConfig;
  for (const key of SECTION_KEYS) {
    const value = raw?.[key] ?? {};
    out[key] = {
      visible: typeof value.visible === "boolean" ? value.visible : seedSections[key].visible,
      eyebrow: typeof value.eyebrow === "string" ? value.eyebrow : seedSections[key].eyebrow,
      title: typeof value.title === "string" ? value.title : seedSections[key].title,
      description:
        typeof value.description === "string" ? value.description : seedSections[key].description,
    };
  }
  return out;
}

export function normalizeSettings(row: SiteSettingsRow | null): PortfolioData["settings"] {
  const base: SiteSettingsRow = row ?? {
    id: "default",
    variant: "published",
    published_at: null,
    updated_at: new Date(0).toISOString(),
    ...seedSettings,
  };
  return { ...base, sections: normalizeSections(base.sections) };
}

/** Same masking as get_public_profile(), applied to a full row (admin preview). */
export function toPublicProfile(row: Omit<ProfileRow, "id" | "updated_at">): PublicProfile {
  return {
    full_name: row.full_name,
    headline: row.headline,
    about: row.about,
    focus_areas: row.focus_areas ?? [],
    location: row.location,
    email: row.show_email ? row.email : null,
    phone: row.show_phone ? row.phone : null,
    avatar_path: row.avatar_path,
    has_resume: Boolean(row.resume_path),
    resume_updated_at: row.resume_updated_at,
    github_url: row.github_url,
    linkedin_url: row.linkedin_url,
    leetcode_url: row.leetcode_url,
    codechef_url: row.codechef_url,
    website_url: row.website_url,
  };
}

export function withAvatar(profile: PublicProfile): PortfolioData["profile"] {
  return { ...profile, focus_areas: profile.focus_areas ?? [], avatar_url: mediaUrl(profile.avatar_path) };
}

export function toPublicProject(row: ProjectRow): PublicProject {
  return {
    ...row,
    features: row.features ?? [],
    tech_stack: row.tech_stack ?? [],
    screenshot_paths: row.screenshot_paths ?? [],
    cover_url: mediaUrl(row.cover_path),
    screenshot_urls: (row.screenshot_paths ?? [])
      .map((p) => mediaUrl(p))
      .filter((u): u is string => Boolean(u)),
  };
}

/** Certificate files live in a private bucket and are served via routes that check publication. */
export function toPublicCertificate(row: CertificateRow): PublicCertificate {
  const { image_path, pdf_path, ...rest } = row;
  return {
    ...rest,
    image_url: image_path ? `/certificates/${row.id}/image` : null,
    pdf_url: pdf_path ? `/certificates/${row.id}/pdf` : null,
  };
}

export function toPublicAchievement(row: AchievementRow): PublicAchievement {
  return { ...row, image_url: mediaUrl(row.image_path) };
}
