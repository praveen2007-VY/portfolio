// Row shapes mirror supabase/migrations/*_portfolio_schema.sql.

export type PartialDate = string; // 'YYYY' | 'YYYY-MM' | 'YYYY-MM-DD'

export const ACCENTS = ["cobalt", "electric", "indigo", "ocean", "violet"] as const;
export type Accent = (typeof ACCENTS)[number];

export const SECTION_KEYS = [
  "about",
  "experience",
  "skills",
  "projects",
  "certificates",
  "achievements",
  "coding",
  "contact",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type SectionConfig = {
  visible: boolean;
  eyebrow: string;
  title: string;
  description: string;
};

export type SectionsConfig = Record<SectionKey, SectionConfig>;

export type ProfileRow = {
  id: string;
  full_name: string;
  headline: string | null;
  about: string | null;
  focus_areas: string[];
  location: string | null;
  email: string | null;
  show_email: boolean;
  phone: string | null;
  show_phone: boolean;
  avatar_path: string | null;
  resume_path: string | null;
  resume_file_name: string | null;
  resume_updated_at: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  leetcode_url: string | null;
  codechef_url: string | null;
  website_url: string | null;
  updated_at: string;
};

/** What visitors are allowed to see (see get_public_profile()). */
export type PublicProfile = {
  full_name: string;
  headline: string | null;
  about: string | null;
  focus_areas: string[];
  location: string | null;
  email: string | null;
  phone: string | null;
  avatar_path: string | null;
  has_resume: boolean;
  resume_updated_at: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  leetcode_url: string | null;
  codechef_url: string | null;
  website_url: string | null;
};

export type SiteSettingsRow = {
  id: string;
  variant: "draft" | "published";
  hero_eyebrow: string | null;
  hero_greeting: string;
  hero_title: string;
  hero_highlight: string | null;
  hero_intro: string | null;
  sections: Partial<Record<SectionKey, Partial<SectionConfig>>>;
  accent: Accent;
  animation_level: "full" | "reduced";
  enable_3d: boolean;
  coding_summary: string | null;
  footer_text: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
};

type ContentBase = {
  id: string;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectRow = ContentBase & {
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  problem: string | null;
  solution: string | null;
  features: string[];
  tech_stack: string[];
  category: string | null;
  cover_path: string | null;
  screenshot_paths: string[];
  repo_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  start_date: PartialDate | null;
  end_date: PartialDate | null;
  is_featured: boolean;
  published_at: string | null;
};

export type CertificateRow = ContentBase & {
  title: string;
  issuer: string;
  issue_date: PartialDate | null;
  expiry_date: PartialDate | null;
  credential_id: string | null;
  credential_url: string | null;
  image_path: string | null;
  pdf_path: string | null;
  category: string | null;
  description: string | null;
};

export type AchievementRow = ContentBase & {
  title: string;
  organization: string | null;
  highlight: string | null;
  description: string | null;
  category: string | null;
  achieved_on: PartialDate | null;
  link_url: string | null;
  image_path: string | null;
};

export type CodingProfileRow = ContentBase & {
  platform: string;
  username: string | null;
  profile_url: string | null;
  problems_solved: number | null;
  max_rating: number | null;
  note: string | null;
};

export type SkillRow = ContentBase & {
  name: string;
  category: string;
};

export type ExperienceRow = ContentBase & {
  role: string;
  organization: string;
  location: string | null;
  employment_type: string | null;
  start_date: PartialDate | null;
  end_date: PartialDate | null;
  is_current: boolean;
  summary: string | null;
  highlights: string[];
  technologies: string[];
};

export type EducationRow = ContentBase & {
  degree: string;
  field: string | null;
  institution: string;
  location: string | null;
  start_date: PartialDate | null;
  end_date: PartialDate | null;
  grade: string | null;
  grade_label: string | null;
  coursework: string[];
  description: string | null;
};

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

/** Public certificate: storage paths are replaced by serving routes. */
export type PublicCertificate = Omit<CertificateRow, "image_path" | "pdf_path"> & {
  image_url: string | null;
  pdf_url: string | null;
};

export type PublicProject = ProjectRow & {
  cover_url: string | null;
  screenshot_urls: string[];
};

export type PublicAchievement = AchievementRow & { image_url: string | null };

export type PortfolioData = {
  source: "database" | "fallback" | "unavailable";
  profile: PublicProfile & { avatar_url: string | null };
  settings: Omit<SiteSettingsRow, "sections"> & { sections: SectionsConfig };
  projects: PublicProject[];
  certificates: PublicCertificate[];
  achievements: PublicAchievement[];
  codingProfiles: CodingProfileRow[];
  skills: SkillRow[];
  experiences: ExperienceRow[];
  education: EducationRow[];
  contactEnabled: boolean;
  generatedAt: string;
};
