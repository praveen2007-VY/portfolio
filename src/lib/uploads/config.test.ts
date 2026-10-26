import { describe, expect, it } from "vitest";
import {
  BUCKET_MAX_BYTES,
  buildStoragePath,
  isPathForKind,
  resolveUploadLimits,
  safeDownloadName,
  validateUpload,
} from "@/lib/uploads/config";

const ID = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const limits = resolveUploadLimits({});

describe("validateUpload", () => {
  it("accepts allowed types within the limit", () => {
    expect(validateUpload("project-cover", { type: "image/webp", size: 1000 }, limits)).toBeNull();
    expect(validateUpload("resume", { type: "application/pdf", size: 2_000_000 }, limits)).toBeNull();
  });

  it("rejects disallowed MIME types", () => {
    expect(validateUpload("project-cover", { type: "image/svg+xml", size: 100 }, limits)).toMatch(/Unsupported/);
    expect(validateUpload("resume", { type: "image/png", size: 100 }, limits)).toMatch(/Unsupported/);
    expect(validateUpload("avatar", { type: "text/html", size: 100 }, limits)).toMatch(/Unsupported/);
  });

  it("rejects empty and oversized files", () => {
    expect(validateUpload("avatar", { type: "image/png", size: 0 }, limits)).toMatch(/empty/);
    expect(validateUpload("avatar", { type: "image/png", size: BUCKET_MAX_BYTES.image + 1 }, limits)).toMatch(
      /too large/,
    );
  });
});

describe("resolveUploadLimits", () => {
  it("uses env values but never exceeds the bucket ceiling", () => {
    expect(resolveUploadLimits({ UPLOAD_MAX_IMAGE_MB: "2" }).image).toBe(2 * 1024 * 1024);
    expect(resolveUploadLimits({ UPLOAD_MAX_IMAGE_MB: "500" }).image).toBe(BUCKET_MAX_BYTES.image);
    expect(resolveUploadLimits({ UPLOAD_MAX_DOCUMENT_MB: "nonsense" }).document).toBe(BUCKET_MAX_BYTES.document);
  });
});

describe("storage paths", () => {
  it("builds paths from a fixed prefix, a UUID and a MIME-derived extension", () => {
    expect(buildStoragePath("certificate-pdf", "application/pdf", ID)).toBe(`certificates/pdfs/${ID}.pdf`);
    expect(buildStoragePath("avatar", "image/jpeg", ID)).toBe(`profile/${ID}.jpg`);
  });

  it("refuses unsafe ids and mismatched types", () => {
    expect(() => buildStoragePath("avatar", "image/png", "../../etc/passwd")).toThrow();
    expect(() => buildStoragePath("resume", "image/png", ID)).toThrow();
  });

  it("validates saved paths per upload kind", () => {
    expect(isPathForKind("project-cover", `projects/covers/${ID}.png`)).toBe(true);
    expect(isPathForKind("project-cover", `projects/screenshots/${ID}.png`)).toBe(false);
    expect(isPathForKind("resume", `resume/${ID}.pdf`)).toBe(true);
    expect(isPathForKind("resume", `resume/../${ID}.pdf`)).toBe(false);
    expect(isPathForKind("resume", `resume/${ID}.pdf.exe`)).toBe(false);
    expect(isPathForKind("avatar", null)).toBe(false);
  });
});

describe("safeDownloadName", () => {
  it("strips unsafe characters and forces a .pdf extension", () => {
    expect(safeDownloadName('Praveen R "resume"<script>.pdf', "Resume")).toBe("Praveen-R-resumescript.pdf");
    expect(safeDownloadName(null, "Resume")).toBe("Resume.pdf");
    expect(safeDownloadName("../../x", "Resume")).toBe("....x.pdf");
  });
});
