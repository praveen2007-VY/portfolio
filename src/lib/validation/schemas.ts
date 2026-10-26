import { z } from "zod";
import { ACCENTS, SECTION_KEYS, type SectionKey } from "@/types/portfolio";
import { isPathForKind, type UploadKind } from "@/lib/uploads/config";

// ---------------------------------------------------------------------------
// Field helpers. Form inputs produce '' for empty values; the database stores
// null, so optional fields normalise '' -> null.
// ---------------------------------------------------------------------------

export const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .nullish()
    .transform((v) => (v ? v : null));

export const optionalUrl = z
  .string()
  .trim()
  .max(2048, "URL is too long")
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/[^\s]+$/i.test(v), "Enter a full URL starting with https://");

export const PARTIAL_DATE_RE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;

export const optionalPartialDate = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || PARTIAL_DATE_RE.test(v), "Use YYYY, YYYY-MM or YYYY-MM-DD");

export const stringList = (max: number, itemMax = 300) =>
  z
    .array(z.string().trim().max(itemMax, `Each item must be ${itemMax} characters or fewer`))
    .nullish()
    .transform((items) => (items ?? []).filter((item) => item.length > 0))
    .refine((items) => items.length <= max, `At most ${max} items`);

export const optionalInt = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
      ctx.addIssue({ code: "custom", message: "Enter a whole number" });
      return z.NEVER;
    }
    return n;
  });

const bool = z.boolean().default(false);

const storagePath = (kind: UploadKind) =>
  z
    .string()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || isPathForKind(kind, v), "Invalid file reference");

const storagePaths = (kind: UploadKind, max: number) =>
  z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? [])
    .refine((v) => v.length <= max, `At most ${max} files`)
    .refine((v) => v.every((p) => isPathForKind(kind, p)), "Invalid file reference");

const dateRange = <T extends { start_date: string | null; end_date: string | null }>(v: T) =>
  !v.start_date || !v.end_date || v.end_date >= v.start_date;
const dateRangeError = { message: "End date must be after the start date", path: ["end_date"] };

// ---------------------------------------------------------------------------
// Content schemas
// ---------------------------------------------------------------------------

export const projectSchema = z
  .object({
    slug: requiredText("Slug", 80).regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and single hyphens",
    ),
    title: requiredText("Title", 160),
    summary: optionalText(400),
    description: optionalText(8000),
    problem: optionalText(3000),
    solution: optionalText(3000),
    features: stringList(30),
    tech_stack: stringList(30, 60),
    category: optionalText(60),
    cover_path: storagePath("project-cover"),
    screenshot_paths: storagePaths("project-screenshot", 12),
    repo_url: optionalUrl,
    demo_url: optionalUrl,
    video_url: optionalUrl,
    start_date: optionalPartialDate,
    end_date: optionalPartialDate,
    is_featured: bool,
    is_published: bool,
  })
  .refine(dateRange, dateRangeError);

export const certificateSchema = z
  .object({
    title: requiredText("Title", 200),
    issuer: requiredText("Issuer", 120),
    issue_date: optionalPartialDate,
    expiry_date: optionalPartialDate,
    credential_id: optionalText(120),
    credential_url: optionalUrl,
    image_path: storagePath("certificate-image"),
    pdf_path: storagePath("certificate-pdf"),
    category: optionalText(60),
    description: optionalText(2000),
    is_published: bool,
  })
  .refine((v) => !v.issue_date || !v.expiry_date || v.expiry_date >= v.issue_date, {
    message: "Expiry must be after the issue date",
    path: ["expiry_date"],
  });

export const achievementSchema = z.object({
  title: requiredText("Title", 200),
  organization: optionalText(120),
  highlight: optionalText(60),
  description: optionalText(2000),
  category: optionalText(60),
  achieved_on: optionalPartialDate,
  link_url: optionalUrl,
  image_path: storagePath("achievement-image"),
  is_published: bool,
});

export const codingProfileSchema = z.object({
  platform: requiredText("Platform", 60),
  username: optionalText(60),
  profile_url: optionalUrl,
  problems_solved: optionalInt,
  max_rating: optionalInt,
  note: optionalText(200),
  is_published: bool,
});

export const skillSchema = z.object({
  name: requiredText("Name", 60),
  category: requiredText("Category", 60),
  is_published: bool,
});

export const experienceSchema = z
  .object({
    role: requiredText("Role", 120),
    organization: requiredText("Organization", 160),
    location: optionalText(120),
    employment_type: optionalText(60),
    start_date: optionalPartialDate,
    end_date: optionalPartialDate,
    is_current: bool,
    summary: optionalText(1000),
    highlights: stringList(20),
    technologies: stringList(30, 60),
    is_published: bool,
  })
  .refine(dateRange, dateRangeError);

export const educationSchema = z
  .object({
    degree: requiredText("Degree", 160),
    field: optionalText(160),
    institution: requiredText("Institution", 200),
    location: optionalText(120),
    start_date: optionalPartialDate,
    end_date: optionalPartialDate,
    grade: optionalText(40),
    grade_label: optionalText(40),
    coursework: stringList(30, 120),
    description: optionalText(2000),
    is_published: bool,
  })
  .refine(dateRange, dateRangeError);

// ---------------------------------------------------------------------------
// Profile & settings
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  full_name: requiredText("Name", 120),
  headline: optionalText(240),
  about: optionalText(6000),
  focus_areas: stringList(12, 120),
  location: optionalText(120),
  email: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || z.email().safeParse(v).success, "Enter a valid email address"),
  show_email: bool,
  phone: z
    .string()
    .trim()
    .nullish()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[0-9+()\-\s]{6,24}$/.test(v), "Enter a valid phone number"),
  show_phone: bool,
  avatar_path: storagePath("avatar"),
  github_url: optionalUrl,
  linkedin_url: optionalUrl,
  leetcode_url: optionalUrl,
  codechef_url: optionalUrl,
  website_url: optionalUrl,
});

export const resumeSchema = z.object({
  resume_path: storagePath("resume").refine((v) => v !== null, "Upload a PDF first"),
  resume_file_name: optionalText(120),
});

const sectionSchema = z.object({
  visible: z.boolean().default(true),
  eyebrow: z.string().trim().max(60).default(""),
  title: z.string().trim().max(160).default(""),
  description: z.string().trim().max(500).default(""),
});

export const settingsSchema = z.object({
  hero_eyebrow: optionalText(120),
  hero_greeting: z.string().trim().max(120).default(""),
  hero_title: requiredText("Hero title", 200),
  hero_highlight: optionalText(120),
  hero_intro: optionalText(800),
  sections: z.object(
    Object.fromEntries(SECTION_KEYS.map((key) => [key, sectionSchema])) as Record<
      SectionKey,
      typeof sectionSchema
    >,
  ),
  accent: z.enum(ACCENTS),
  animation_level: z.enum(["full", "reduced"]),
  enable_3d: z.boolean(),
  coding_summary: optionalText(200),
  footer_text: optionalText(300),
  seo_title: optionalText(120),
  seo_description: optionalText(300),
});

// ---------------------------------------------------------------------------
// Public forms
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const contactSchema = z.object({
  name: requiredText("Name", 80).min(2, "Name is too short"),
  email: z.email("Enter a valid email address").max(200),
  message: requiredText("Message", 4000).min(10, "Please write at least 10 characters"),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
