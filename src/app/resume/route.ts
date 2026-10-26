import { connection } from "next/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { safeDownloadName } from "@/lib/uploads/config";

/**
 * Always serves the currently published resume: looks up the path at request
 * time and redirects to a short-lived signed URL in the private bucket.
 */
export async function GET() {
  await connection();
  const supabase = createSupabasePublicClient();
  if (!supabase) return new Response("Resume is not available.", { status: 404 });

  const { data, error } = await supabase.rpc("get_public_resume");
  const row = (data as { resume_path: string; resume_file_name: string | null }[] | null)?.[0];
  if (error || !row) return new Response("Resume is not available.", { status: 404 });

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(row.resume_path, 60, { download: safeDownloadName(row.resume_file_name, "Resume") });
  if (signError || !signed) {
    console.error("[resume] could not sign URL:", signError);
    return new Response("Resume is temporarily unavailable.", { status: 503 });
  }

  return new Response(null, {
    status: 302,
    headers: { Location: signed.signedUrl, "Cache-Control": "no-store" },
  });
}
