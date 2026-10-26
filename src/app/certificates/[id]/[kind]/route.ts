import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const params = z.object({ id: z.uuid(), kind: z.enum(["image", "pdf"]) });

/**
 * Serves a certificate file from the private bucket via a short-lived signed
 * URL. The query runs with the visitor's session, so RLS only returns
 * published certificates to the public (admins can also open drafts).
 */
export async function GET(_request: Request, ctx: RouteContext<"/certificates/[id]/[kind]">) {
  const parsed = params.safeParse(await ctx.params);
  if (!parsed.success || !isSupabaseConfigured()) return new Response("Not found", { status: 404 });

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("certificates")
    .select("image_path, pdf_path")
    .eq("id", parsed.data.id)
    .maybeSingle();
  const path = parsed.data.kind === "image" ? data?.image_path : data?.pdf_path;
  if (error || !path) return new Response("Not found", { status: 404 });

  const { data: signed, error: signError } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 600);
  if (signError || !signed) return new Response("File unavailable", { status: 503 });

  return new Response(null, {
    status: 302,
    headers: { Location: signed.signedUrl, "Cache-Control": "private, max-age=300" },
  });
}
