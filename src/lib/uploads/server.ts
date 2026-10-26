import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UserFacingError } from "@/lib/actions/result";
import {
  isPathForKind,
  resolveUploadLimits,
  UPLOAD_KINDS,
  validateUpload,
  type UploadKind,
} from "@/lib/uploads/config";

export function getUploadLimits() {
  return resolveUploadLimits(process.env);
}

/**
 * Confirms that a path the client wants to save points at an object that was
 * actually uploaded, lives under the expected prefix and has an allowed type
 * and size (as recorded by Storage, not as claimed by the browser).
 */
export async function verifyUploadedObject(supabase: SupabaseClient, kind: UploadKind, path: string) {
  if (!isPathForKind(kind, path)) throw new UserFacingError("Invalid file reference.");
  const { bucket } = UPLOAD_KINDS[kind];
  const { data, error } = await supabase.storage.from(bucket).info(path);
  if (error || !data) {
    throw new UserFacingError(`${UPLOAD_KINDS[kind].label} upload was not found. Please upload it again.`);
  }
  const info = data as unknown as {
    size?: number;
    contentType?: string;
    metadata?: { size?: number; mimetype?: string };
  };
  const size = info.size ?? info.metadata?.size ?? 0;
  const type = info.contentType ?? info.metadata?.mimetype ?? "";
  const problem = validateUpload(kind, { type, size }, getUploadLimits());
  if (problem) {
    await supabase.storage.from(bucket).remove([path]);
    throw new UserFacingError(`${UPLOAD_KINDS[kind].label}: ${problem}`);
  }
}

/** Best-effort removal of storage objects that are no longer referenced. */
export async function removeStoredFiles(
  supabase: SupabaseClient,
  files: { kind: UploadKind; path: string }[],
) {
  const byBucket = new Map<string, string[]>();
  for (const { kind, path } of files) {
    if (!isPathForKind(kind, path)) continue;
    const bucket = UPLOAD_KINDS[kind].bucket;
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), path]);
  }
  for (const [bucket, paths] of byBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.error(`[storage] failed to remove ${paths.length} file(s) from ${bucket}:`, error);
  }
}

/** Where each upload kind may be referenced, to avoid deleting files in use. */
const REFERENCES: Record<UploadKind, { table: string; column: string; array?: boolean }> = {
  avatar: { table: "profiles", column: "avatar_path" },
  resume: { table: "profiles", column: "resume_path" },
  "project-cover": { table: "projects", column: "cover_path" },
  "project-screenshot": { table: "projects", column: "screenshot_paths", array: true },
  "achievement-image": { table: "achievements", column: "image_path" },
  "certificate-image": { table: "certificates", column: "image_path" },
  "certificate-pdf": { table: "certificates", column: "pdf_path" },
};

export async function isFileReferenced(supabase: SupabaseClient, kind: UploadKind, path: string) {
  const ref = REFERENCES[kind];
  const query = supabase.from(ref.table).select("id", { count: "exact", head: true });
  const { count, error } = ref.array
    ? await query.contains(ref.column, [path])
    : await query.eq(ref.column, path);
  if (error) throw new UserFacingError("Could not verify whether the file is in use.");
  return (count ?? 0) > 0;
}
