import { getSupabaseConfig } from "@/lib/env";

/** Public URL for an object in the public `media` bucket. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const config = getSupabaseConfig();
  if (!config) return null;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${config.url}/storage/v1/object/public/media/${encoded}`;
}
