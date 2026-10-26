"use server";

import { UserFacingError, withAdmin, type ActionResult } from "@/lib/actions/result";
import { mediaUrl } from "@/lib/supabase/storage";
import {
  buildStoragePath,
  isPathForKind,
  isUploadKind,
  UPLOAD_KINDS,
  validateUpload,
} from "@/lib/uploads/config";
import { getUploadLimits, isFileReferenced } from "@/lib/uploads/server";

export type UploadTicket = { signedUrl: string; path: string; bucket: string };

/**
 * Validates an intended upload and returns a single-use signed upload URL for
 * a server-generated path. The browser then uploads the bytes directly to
 * Supabase Storage (with progress), and the bucket enforces type/size again.
 */
export async function requestUpload(
  kind: string,
  file: { type: string; size: number },
): Promise<ActionResult<UploadTicket>> {
  return withAdmin(async ({ supabase }) => {
    if (!isUploadKind(kind)) throw new UserFacingError("Unknown upload type.");
    const problem = validateUpload(kind, { type: String(file?.type), size: Number(file?.size) }, getUploadLimits());
    if (problem) throw new UserFacingError(problem);

    const path = buildStoragePath(kind, file.type, crypto.randomUUID());
    const bucket = UPLOAD_KINDS[kind].bucket;
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[storage] createSignedUploadUrl failed:", error);
      throw new UserFacingError("Could not start the upload. Check the storage configuration.");
    }
    return { signedUrl: data.signedUrl, path, bucket };
  });
}

/** Deletes an uploaded file that was never saved (e.g. the form was cancelled). */
export async function discardUpload(kind: string, path: string): Promise<ActionResult<null>> {
  return withAdmin(async ({ supabase }) => {
    if (!isUploadKind(kind) || !isPathForKind(kind, path)) throw new UserFacingError("Invalid file reference.");
    if (await isFileReferenced(supabase, kind, path)) return null;
    const { error } = await supabase.storage.from(UPLOAD_KINDS[kind].bucket).remove([path]);
    if (error) console.error("[storage] discard failed:", error);
    return null;
  });
}

/** Viewable URL for an admin preview (signed for private documents). */
export async function getFilePreviewUrl(kind: string, path: string): Promise<ActionResult<string>> {
  return withAdmin(async ({ supabase }) => {
    if (!isUploadKind(kind) || !isPathForKind(kind, path)) throw new UserFacingError("Invalid file reference.");
    const { bucket } = UPLOAD_KINDS[kind];
    if (bucket === "media") {
      const url = mediaUrl(path);
      if (!url) throw new UserFacingError("Storage is not configured.");
      return url;
    }
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300);
    if (error || !data) throw new UserFacingError("Could not open the file.");
    return data.signedUrl;
  });
}
