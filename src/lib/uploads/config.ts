/**
 * Upload rules shared by the browser (pre-flight checks) and the server
 * (authoritative checks before issuing a signed upload URL and before saving a
 * path to the database). Storage bucket limits enforce the same rules again.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const PDF_TYPES = ["application/pdf"] as const;

export const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

export type UploadBucket = "media" | "documents";
export type UploadSizeClass = "image" | "document";

export type UploadKindConfig = {
  label: string;
  bucket: UploadBucket;
  prefix: string;
  types: readonly string[];
  size: UploadSizeClass;
};

export const UPLOAD_KINDS = {
  avatar: { label: "Profile photo", bucket: "media", prefix: "profile/", types: IMAGE_TYPES, size: "image" },
  "project-cover": {
    label: "Project cover",
    bucket: "media",
    prefix: "projects/covers/",
    types: IMAGE_TYPES,
    size: "image",
  },
  "project-screenshot": {
    label: "Project screenshot",
    bucket: "media",
    prefix: "projects/screenshots/",
    types: IMAGE_TYPES,
    size: "image",
  },
  "achievement-image": {
    label: "Achievement image",
    bucket: "media",
    prefix: "achievements/",
    types: IMAGE_TYPES,
    size: "image",
  },
  "certificate-image": {
    label: "Certificate image",
    bucket: "documents",
    prefix: "certificates/images/",
    types: IMAGE_TYPES,
    size: "image",
  },
  "certificate-pdf": {
    label: "Certificate PDF",
    bucket: "documents",
    prefix: "certificates/pdfs/",
    types: PDF_TYPES,
    size: "document",
  },
  resume: { label: "Resume", bucket: "documents", prefix: "resume/", types: PDF_TYPES, size: "document" },
} as const satisfies Record<string, UploadKindConfig>;

export type UploadKind = keyof typeof UPLOAD_KINDS;

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(UPLOAD_KINDS, value);
}

/** Hard ceilings that match the storage bucket configuration in the migration. */
export const BUCKET_MAX_BYTES: Record<UploadSizeClass, number> = {
  image: 5 * 1024 * 1024,
  document: 10 * 1024 * 1024,
};

export type UploadLimits = Record<UploadSizeClass, number>;

export function resolveUploadLimits(env: Record<string, string | undefined>): UploadLimits {
  const parse = (raw: string | undefined, ceiling: number) => {
    const mb = Number(raw);
    if (!raw || !Number.isFinite(mb) || mb <= 0) return ceiling;
    return Math.min(Math.floor(mb * 1024 * 1024), ceiling);
  };
  return {
    image: parse(env.UPLOAD_MAX_IMAGE_MB, BUCKET_MAX_BYTES.image),
    document: parse(env.UPLOAD_MAX_DOCUMENT_MB, BUCKET_MAX_BYTES.document),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateUpload(
  kind: UploadKind,
  file: { type: string; size: number },
  limits: UploadLimits,
): string | null {
  const config = UPLOAD_KINDS[kind];
  if (!(config.types as readonly string[]).includes(file.type)) {
    const allowed = config.types.map((t) => MIME_EXTENSIONS[t].toUpperCase()).join(", ");
    return `Unsupported file type. Allowed: ${allowed}.`;
  }
  if (!Number.isInteger(file.size) || file.size <= 0) return "The file is empty.";
  const max = limits[config.size];
  if (file.size > max) return `File is too large. Maximum size is ${formatBytes(max)}.`;
  return null;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * Storage paths never contain user-supplied names: a fixed per-kind prefix, a
 * random UUID and an extension derived from the validated MIME type.
 */
export function buildStoragePath(kind: UploadKind, mimeType: string, id: string): string {
  const config = UPLOAD_KINDS[kind];
  const ext = MIME_EXTENSIONS[mimeType];
  if (!ext || !(config.types as readonly string[]).includes(mimeType)) throw new Error("Unsupported file type");
  if (!new RegExp(`^${UUID}$`).test(id)) throw new Error("Invalid id");
  return `${config.prefix}${id}.${ext}`;
}

export function isPathForKind(kind: UploadKind, path: unknown): path is string {
  if (typeof path !== "string") return false;
  const config = UPLOAD_KINDS[kind];
  const exts = [...new Set(config.types.map((t) => MIME_EXTENSIONS[t]))].join("|");
  const prefix = config.prefix.replace(/[/]/g, "\\/");
  return new RegExp(`^${prefix}${UUID}\\.(${exts})$`).test(path);
}

/** Download-friendly file name for the resume. */
export function safeDownloadName(name: string | null | undefined, fallback: string): string {
  const cleaned = (name ?? "")
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  const base = cleaned.replace(/\.pdf$/i, "") || fallback;
  return `${base}.pdf`;
}
