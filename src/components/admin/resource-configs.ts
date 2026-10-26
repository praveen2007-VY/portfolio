import type { z } from "zod";
import type { FieldDef } from "@/components/admin/fields";
import type { ResourceKey } from "@/lib/admin/resources";
import { formatDateRange, formatPartialDate } from "@/lib/utils/format";
import {
  achievementSchema,
  certificateSchema,
  codingProfileSchema,
  educationSchema,
  experienceSchema,
  projectSchema,
  skillSchema,
} from "@/lib/validation/schemas";

export type Row = Record<string, unknown> & { id: string; is_published: boolean; sort_order: number };

export type ResourceUI = {
  key: ResourceKey;
  title: string;
  singular: string;
  description: string;
  schema: z.ZodType;
  fields: (rows: Row[]) => FieldDef[];
  summary: (row: Row) => { title: string; subtitle?: string; meta?: string; image?: string | null };
  imageBucket?: "media" | "documents";
  featured?: boolean;
  visibilityLabels?: { on: string; off: string };
  previewHref?: (row: Row) => string;
  groupBy?: "category";
};

const s = (v: unknown) => (typeof v === "string" ? v : "");
const unique = (rows: Row[], key: string) =>
  [...new Set(rows.map((r) => s(r[key])).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const dateHelp = "YYYY, YYYY-MM or YYYY-MM-DD — use only the precision you know.";

export const RESOURCE_UI: Record<ResourceKey, ResourceUI> = {
  projects: {
    key: "projects",
    title: "Projects",
    singular: "project",
    description: "Create, edit and publish the projects shown in the Featured projects section.",
    schema: projectSchema,
    featured: true,
    imageBucket: "media",
    previewHref: (row) => `/preview/projects/${s(row.slug)}`,
    summary: (row) => ({
      title: s(row.title),
      subtitle: s(row.summary),
      meta: [s(row.category), formatDateRange(s(row.start_date), s(row.end_date))].filter(Boolean).join(" · "),
      image: (row.cover_path as string) ?? null,
    }),
    fields: (rows) => [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "slug",
        label: "URL slug",
        type: "slug",
        required: true,
        help: "Lowercase words separated by hyphens. Used in /projects/<slug>.",
      },
      { name: "summary", label: "Short summary", type: "textarea", rows: 2, help: "Shown on the project card." },
      { name: "category", label: "Category", type: "combobox", suggestions: unique(rows, "category"), span: "half" },
      { name: "tech_stack", label: "Technology stack", type: "tags", span: "half" },
      { name: "start_date", label: "Start date", type: "date", span: "half", help: dateHelp },
      { name: "end_date", label: "Completion date", type: "date", span: "half" },
      { name: "cover_path", label: "Cover image", type: "file", kind: "project-cover" },
      { name: "screenshot_paths", label: "Screenshots", type: "files", kind: "project-screenshot", max: 12 },
      { name: "description", label: "Full description", type: "textarea", rows: 7, help: "Separate paragraphs with a blank line." },
      { name: "problem", label: "Problem statement", type: "textarea", rows: 3, span: "half" },
      { name: "solution", label: "Proposed solution", type: "textarea", rows: 3, span: "half" },
      { name: "features", label: "Key features", type: "list" },
      { name: "repo_url", label: "GitHub repository URL", type: "url", span: "half", placeholder: "https://github.com/…" },
      { name: "demo_url", label: "Live demo URL", type: "url", span: "half", placeholder: "https://…" },
      { name: "video_url", label: "Video or presentation URL", type: "url" },
      { name: "is_featured", label: "Featured project", type: "switch", help: "Featured projects are shown as large cards first." },
    ],
  },
  certificates: {
    key: "certificates",
    title: "Certificates",
    singular: "certificate",
    description: "Upload certificate images or PDFs, add verification details and control what is public.",
    schema: certificateSchema,
    imageBucket: "documents",
    summary: (row) => ({
      title: s(row.title),
      subtitle: [s(row.issuer), formatPartialDate(s(row.issue_date))].filter(Boolean).join(" · "),
      meta: [
        s(row.category),
        row.pdf_path ? "PDF" : "",
        row.image_path ? "Image" : "",
        row.credential_url ? "Verification link" : "",
      ]
        .filter(Boolean)
        .join(" · "),
    }),
    fields: (rows) => [
      { name: "title", label: "Certificate title", type: "text", required: true },
      { name: "issuer", label: "Issuing organization", type: "combobox", suggestions: unique(rows, "issuer"), required: true, span: "half" },
      { name: "category", label: "Category", type: "combobox", suggestions: unique(rows, "category"), span: "half" },
      { name: "issue_date", label: "Issue date", type: "date", span: "half", help: dateHelp },
      { name: "expiry_date", label: "Expiration date", type: "date", span: "half", help: "Leave empty if it does not expire." },
      { name: "credential_id", label: "Credential ID", type: "text", span: "half" },
      { name: "credential_url", label: "Verification URL", type: "url", span: "half" },
      { name: "image_path", label: "Certificate image", type: "file", kind: "certificate-image" },
      { name: "pdf_path", label: "Certificate PDF", type: "file", kind: "certificate-pdf" },
      { name: "description", label: "Description", type: "textarea", rows: 3 },
    ],
  },
  achievements: {
    key: "achievements",
    title: "Achievements",
    singular: "achievement",
    description: "Awards, grants, hackathons and competition results.",
    schema: achievementSchema,
    imageBucket: "media",
    summary: (row) => ({
      title: s(row.title),
      subtitle: [s(row.highlight), s(row.organization)].filter(Boolean).join(" · "),
      meta: [s(row.category), formatPartialDate(s(row.achieved_on))].filter(Boolean).join(" · "),
      image: (row.image_path as string) ?? null,
    }),
    fields: (rows) => [
      { name: "title", label: "Title", type: "text", required: true },
      {
        name: "highlight",
        label: "Highlight",
        type: "text",
        span: "half",
        help: "Short emphasis, e.g. “Rank 6” or “₹10,000 grant”.",
      },
      { name: "organization", label: "Organization / event", type: "text", span: "half" },
      { name: "category", label: "Category", type: "combobox", suggestions: unique(rows, "category"), span: "half" },
      { name: "achieved_on", label: "Date", type: "date", span: "half", help: dateHelp },
      { name: "link_url", label: "Link", type: "url" },
      { name: "image_path", label: "Supporting image", type: "file", kind: "achievement-image" },
      { name: "description", label: "Description", type: "textarea", rows: 3 },
    ],
  },
  coding_profiles: {
    key: "coding_profiles",
    title: "Coding statistics",
    singular: "coding profile",
    description: "Competitive programming platforms. Problem counts are shown as “N+”.",
    schema: codingProfileSchema,
    summary: (row) => ({
      title: s(row.platform),
      subtitle: [
        row.problems_solved != null ? `${row.problems_solved}+ solved` : "",
        row.max_rating != null ? `max rating ${row.max_rating}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      meta: s(row.username) ? `@${s(row.username)}` : undefined,
    }),
    fields: () => [
      { name: "platform", label: "Platform", type: "text", required: true, span: "half" },
      { name: "username", label: "Username", type: "text", span: "half" },
      { name: "profile_url", label: "Profile URL", type: "url" },
      { name: "problems_solved", label: "Problems solved", type: "number", span: "half" },
      { name: "max_rating", label: "Max rating", type: "number", span: "half" },
      { name: "note", label: "Note", type: "text" },
    ],
  },
  skills: {
    key: "skills",
    title: "Skills",
    singular: "skill",
    description: "Technologies grouped by category. Hidden skills are not shown publicly.",
    schema: skillSchema,
    groupBy: "category",
    visibilityLabels: { on: "Visible", off: "Hidden" },
    summary: (row) => ({ title: s(row.name) }),
    fields: (rows) => [
      { name: "name", label: "Skill", type: "text", required: true, span: "half" },
      {
        name: "category",
        label: "Category",
        type: "combobox",
        suggestions: unique(rows, "category"),
        required: true,
        span: "half",
      },
    ],
  },
  experiences: {
    key: "experiences",
    title: "Experience",
    singular: "experience",
    description: "Internships and roles shown on the timeline.",
    schema: experienceSchema,
    summary: (row) => ({
      title: s(row.role),
      subtitle: s(row.organization),
      meta: formatDateRange(s(row.start_date), s(row.end_date), Boolean(row.is_current)),
    }),
    fields: () => [
      { name: "role", label: "Role", type: "text", required: true, span: "half" },
      { name: "organization", label: "Organization", type: "text", required: true, span: "half" },
      { name: "employment_type", label: "Type", type: "text", span: "half", placeholder: "Internship" },
      { name: "location", label: "Location", type: "text", span: "half" },
      { name: "start_date", label: "Start date", type: "date", span: "half", help: dateHelp },
      { name: "end_date", label: "End date", type: "date", span: "half" },
      { name: "is_current", label: "I currently work here", type: "switch" },
      { name: "summary", label: "Summary", type: "textarea", rows: 2 },
      { name: "highlights", label: "Highlights", type: "list" },
      { name: "technologies", label: "Technologies", type: "tags" },
    ],
  },
  education: {
    key: "education",
    title: "Education",
    singular: "education entry",
    description: "Degrees and academic records.",
    schema: educationSchema,
    summary: (row) => ({
      title: [s(row.degree), s(row.field)].filter(Boolean).join(", "),
      subtitle: s(row.institution),
      meta: [formatDateRange(s(row.start_date), s(row.end_date)), s(row.grade) && `${s(row.grade_label) || "Grade"} ${s(row.grade)}`]
        .filter(Boolean)
        .join(" · "),
    }),
    fields: () => [
      { name: "degree", label: "Degree", type: "text", required: true, span: "half" },
      { name: "field", label: "Field of study", type: "text", span: "half" },
      { name: "institution", label: "Institution", type: "text", required: true },
      { name: "location", label: "Location", type: "text" },
      { name: "start_date", label: "Start", type: "date", span: "half", help: dateHelp },
      { name: "end_date", label: "End (or expected)", type: "date", span: "half" },
      { name: "grade", label: "Grade", type: "text", span: "half", placeholder: "8.1/10.0" },
      { name: "grade_label", label: "Grade label", type: "text", span: "half", placeholder: "CGPA" },
      { name: "coursework", label: "Coursework", type: "tags" },
      { name: "description", label: "Description", type: "textarea", rows: 3 },
    ],
  },
};

/** Database row -> form values ('' for empty text, arrays kept, numbers as strings). */
export function rowToForm(fields: FieldDef[], row: Row | null): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = row?.[field.name];
    switch (field.type) {
      case "tags":
      case "list":
      case "files":
        values[field.name] = Array.isArray(raw) ? raw : [];
        break;
      case "switch":
        values[field.name] = Boolean(raw);
        break;
      case "number":
        values[field.name] = raw === null || raw === undefined ? "" : String(raw);
        break;
      case "file":
        values[field.name] = (raw as string | null) ?? null;
        break;
      default:
        values[field.name] = (raw as string | null) ?? "";
    }
  }
  return values;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
