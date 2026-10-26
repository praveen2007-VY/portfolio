import type { z } from "zod";
import type { UploadKind } from "@/lib/uploads/config";
import {
  achievementSchema,
  certificateSchema,
  codingProfileSchema,
  educationSchema,
  experienceSchema,
  projectSchema,
  skillSchema,
} from "@/lib/validation/schemas";

/**
 * Whitelist of content tables the admin actions may touch. The client only
 * ever sends a resource key; table names, schemas and file columns come from
 * this server-trusted map.
 */
export const RESOURCES = {
  projects: {
    table: "projects",
    singular: "project",
    schema: projectSchema,
    files: { cover_path: "project-cover", screenshot_paths: "project-screenshot" },
    flags: ["is_published", "is_featured"],
  },
  certificates: {
    table: "certificates",
    singular: "certificate",
    schema: certificateSchema,
    files: { image_path: "certificate-image", pdf_path: "certificate-pdf" },
    flags: ["is_published"],
  },
  achievements: {
    table: "achievements",
    singular: "achievement",
    schema: achievementSchema,
    files: { image_path: "achievement-image" },
    flags: ["is_published"],
  },
  coding_profiles: {
    table: "coding_profiles",
    singular: "coding profile",
    schema: codingProfileSchema,
    files: {},
    flags: ["is_published"],
  },
  skills: {
    table: "skills",
    singular: "skill",
    schema: skillSchema,
    files: {},
    flags: ["is_published"],
  },
  experiences: {
    table: "experiences",
    singular: "experience",
    schema: experienceSchema,
    files: {},
    flags: ["is_published"],
  },
  education: {
    table: "education",
    singular: "education entry",
    schema: educationSchema,
    files: {},
    flags: ["is_published"],
  },
} as const satisfies Record<
  string,
  {
    table: string;
    singular: string;
    schema: z.ZodType;
    files: Record<string, UploadKind>;
    flags: readonly string[];
  }
>;

export type ResourceKey = keyof typeof RESOURCES;
export type ResourceFlag = "is_published" | "is_featured";

export function isResourceKey(value: unknown): value is ResourceKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RESOURCES, value);
}

/** Storage objects referenced by a row, for cleanup after replace/delete. */
export function collectFilePaths(
  resource: ResourceKey,
  row: Record<string, unknown> | null | undefined,
): { kind: UploadKind; path: string }[] {
  if (!row) return [];
  const files = RESOURCES[resource].files as Record<string, UploadKind>;
  const out: { kind: UploadKind; path: string }[] = [];
  for (const [column, kind] of Object.entries(files)) {
    const value = row[column];
    const paths = Array.isArray(value) ? value : value ? [value] : [];
    for (const path of paths) if (typeof path === "string") out.push({ kind, path });
  }
  return out;
}
