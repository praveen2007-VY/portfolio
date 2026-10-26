import { describe, expect, it } from "vitest";
import {
  contactSchema,
  loginSchema,
  profileSchema,
  projectSchema,
  settingsSchema,
} from "@/lib/validation/schemas";
import { seedSettings } from "@/lib/content/resume";

const baseProject = {
  slug: "sign-aura",
  title: "Sign Aura",
  summary: "",
  features: ["One", "", "  Two  "],
  tech_stack: ["AI"],
  repo_url: "",
  start_date: "2026-05",
  end_date: "",
  is_featured: true,
  is_published: false,
};

describe("projectSchema", () => {
  it("normalises empty strings to null and trims lists", () => {
    const parsed = projectSchema.parse(baseProject);
    expect(parsed.summary).toBeNull();
    expect(parsed.repo_url).toBeNull();
    expect(parsed.end_date).toBeNull();
    expect(parsed.features).toEqual(["One", "Two"]);
  });

  it("rejects invalid slugs, URLs, dates and storage paths", () => {
    expect(projectSchema.safeParse({ ...baseProject, slug: "Sign Aura!" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...baseProject, repo_url: "javascript:alert(1)" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...baseProject, start_date: "May 2026" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...baseProject, cover_path: "../secret.png" }).success).toBe(false);
    expect(
      projectSchema.safeParse({ ...baseProject, start_date: "2026-05", end_date: "2025-01" }).success,
    ).toBe(false);
  });
});

describe("profileSchema", () => {
  it("does not accept privilege-related fields", () => {
    const parsed = profileSchema.parse({ full_name: "Praveen R", is_admin: true, role: "admin" } as never);
    expect(parsed).not.toHaveProperty("is_admin");
    expect(parsed).not.toHaveProperty("role");
  });
});

describe("settingsSchema", () => {
  it("accepts the seeded settings and rejects unknown accents", () => {
    expect(settingsSchema.safeParse(seedSettings).success).toBe(true);
    expect(settingsSchema.safeParse({ ...seedSettings, accent: "neon" }).success).toBe(false);
  });
});

describe("login and contact", () => {
  it("validates login input", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "long-enough" }).success).toBe(true);
  });

  it("flags a filled honeypot", () => {
    const result = contactSchema.safeParse({
      name: "Bot",
      email: "bot@example.com",
      message: "Buy now buy now",
      website: "http://spam",
    });
    expect(result.success).toBe(false);
  });
});
