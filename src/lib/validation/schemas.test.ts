import { describe, expect, it } from "vitest";
import {
  contactSchema,
  experienceSchema,
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

describe("experienceSchema", () => {
  const baseExperience = {
    role: "DevOps with AWS Intern",
    organization: "Finest Coder / Codingmart Technologies",
    start_date: "2026-05",
    end_date: "2026-06",
    is_current: false,
    highlights: ["Set up cloud infrastructure"],
    technologies: ["AWS", "Linux"],
    is_published: true,
  };

  it("accepts valid experience without certificate", () => {
    const parsed = experienceSchema.parse(baseExperience);
    expect(parsed.certificate_title).toBeNull();
    expect(parsed.certificate_image_path).toBeNull();
    expect(parsed.certificate_pdf_path).toBeNull();
  });

  it("accepts valid experience with certificate metadata and file paths", () => {
    const parsed = experienceSchema.parse({
      ...baseExperience,
      certificate_title: "AWS DevOps Internship Certificate",
      certificate_organization: "Finest Coder",
      certificate_date: "2026-06",
      certificate_url: "https://example.com/verify/123",
      certificate_image_path: "certificates/images/11111111-1111-4111-8111-111111111111.png",
      certificate_pdf_path: "certificates/pdfs/22222222-2222-4222-8222-222222222222.pdf",
    });
    expect(parsed.certificate_title).toBe("AWS DevOps Internship Certificate");
    expect(parsed.certificate_image_path).toBe(
      "certificates/images/11111111-1111-4111-8111-111111111111.png",
    );
    expect(parsed.certificate_pdf_path).toBe(
      "certificates/pdfs/22222222-2222-4222-8222-222222222222.pdf",
    );
  });

  it("rejects invalid certificate file paths or URLs", () => {
    expect(
      experienceSchema.safeParse({
        ...baseExperience,
        certificate_image_path: "../malicious.png",
      }).success,
    ).toBe(false);
    expect(
      experienceSchema.safeParse({
        ...baseExperience,
        certificate_url: "javascript:alert(1)",
      }).success,
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
