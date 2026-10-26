/**
 * Generates supabase/seed.sql from src/lib/content/resume.ts.
 *
 *   npm run seed:generate
 *
 * The generated SQL is safe to rerun: every table is seeded only while it is
 * empty, so edits made in the admin dashboard are never overwritten.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  seedAchievements,
  seedCertificates,
  seedCodingProfiles,
  seedEducation,
  seedExperiences,
  seedProfile,
  seedProjects,
  seedSettings,
  seedSkills,
} from "../src/lib/content/resume.ts";

type Value = string | number | boolean | null | string[] | Record<string, unknown>;

export function sqlValue(value: Value): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'::text[]";
    return `array[${value.map((v) => sqlValue(v)).join(", ")}]::text[]`;
  }
  if (typeof value === "object") return `${sqlValue(JSON.stringify(value))}::jsonb`;
  return `'${value.replace(/'/g, "''")}'`;
}

function insertRows(table: string, rows: Record<string, Value>[], withOrder = true): string {
  const prepared = rows.map((row, index) => (withOrder ? { ...row, sort_order: index } : row));
  const columns = Object.keys(prepared[0]);
  const values = prepared
    .map((row) => `    (${columns.map((c) => sqlValue(row[c] ?? null)).join(", ")})`)
    .join(",\n");
  return `insert into public.${table} (${columns.join(", ")})\nvalues\n${values}`;
}

function seedWhenEmpty(table: string, rows: Record<string, Value>[], withOrder = true): string {
  return [
    `-- ${table}`,
    `do $seed$`,
    `begin`,
    `  if not exists (select 1 from public.${table}) then`,
    // Not re-indented: string values may contain newlines.
    insertRows(table, rows, withOrder) + ";",
    `  end if;`,
    `end;`,
    `$seed$;`,
  ].join("\n");
}

const strip = <T extends Record<string, unknown>>(row: T, keys: string[]) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => !keys.includes(k))) as Record<string, Value>;

export function generateSeedSql(): string {
  const settingsColumns = seedSettings as unknown as Record<string, Value>;
  const settingsRows = (["draft", "published"] as const).map((variant) => ({
    variant,
    ...settingsColumns,
  }));

  const parts = [
    `-- =============================================================================`,
    `-- GENERATED FILE — do not edit by hand. Source: src/lib/content/resume.ts`,
    `-- Regenerate with: npm run seed:generate`,
    `--`,
    `-- Safe to rerun: each table is only seeded while it is empty, so changes made`,
    `-- in the admin dashboard are never overwritten.`,
    `-- =============================================================================`,
    ``,
    seedWhenEmpty("profiles", [seedProfile as unknown as Record<string, Value>], false),
    ``,
    `-- site_settings (draft + published)`,
    insertRows("site_settings", settingsRows, false) +
      `\non conflict (variant) do nothing;`,
    `update public.site_settings set published_at = now()`,
    `  where variant = 'published' and published_at is null;`,
    ``,
    seedWhenEmpty("experiences", seedExperiences as unknown as Record<string, Value>[]),
    ``,
    seedWhenEmpty("education", seedEducation as unknown as Record<string, Value>[]),
    ``,
    seedWhenEmpty(
      "projects",
      seedProjects.map((p) => strip(p, ["published_at"])),
    ),
    ``,
    seedWhenEmpty("certificates", seedCertificates as unknown as Record<string, Value>[]),
    ``,
    seedWhenEmpty("achievements", seedAchievements as unknown as Record<string, Value>[]),
    ``,
    seedWhenEmpty("coding_profiles", seedCodingProfiles as unknown as Record<string, Value>[]),
    ``,
    seedWhenEmpty("skills", seedSkills as unknown as Record<string, Value>[]),
    ``,
  ];
  return parts.join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const target = new URL("../supabase/seed.sql", import.meta.url);
  writeFileSync(target, generateSeedSql());
  console.log(`Wrote ${fileURLToPath(target)}`);
}
