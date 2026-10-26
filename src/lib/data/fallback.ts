import {
  seedAchievements,
  seedCertificates,
  seedCodingProfiles,
  seedEducation,
  seedExperiences,
  seedProfile,
  seedProjects,
  seedSkills,
} from "@/lib/content/resume";
import {
  normalizeSettings,
  toPublicAchievement,
  toPublicCertificate,
  toPublicProfile,
  toPublicProject,
  withAvatar,
} from "@/lib/data/normalize";
import type { PortfolioData } from "@/types/portfolio";

const EPOCH = new Date(0).toISOString();

function rows<T extends object>(prefix: string, items: T[]) {
  return items.map((item, index) => ({
    ...item,
    id: `${prefix}-${index}`,
    sort_order: index,
    created_at: EPOCH,
    updated_at: EPOCH,
  }));
}

/**
 * Read-only portfolio built from the resume content. Used only when Supabase
 * is not configured (or temporarily unreachable) so the site never renders
 * blank. Nothing here is editable; the dashboard requires Supabase.
 */
export function buildFallbackPortfolio(source: "fallback" | "unavailable"): PortfolioData {
  return {
    source,
    profile: withAvatar(toPublicProfile(seedProfile)),
    settings: normalizeSettings(null),
    projects: rows("project", seedProjects).map(toPublicProject),
    certificates: rows("certificate", seedCertificates).map(toPublicCertificate),
    achievements: rows("achievement", seedAchievements).map(toPublicAchievement),
    codingProfiles: rows("coding", seedCodingProfiles),
    skills: rows("skill", seedSkills),
    experiences: rows("experience", seedExperiences),
    education: rows("education", seedEducation),
    contactEnabled: false,
    generatedAt: new Date().toISOString(),
  };
}
