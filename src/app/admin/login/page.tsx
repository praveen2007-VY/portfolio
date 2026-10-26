import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth/admin";
import { isSupabaseConfigured } from "@/lib/env";

export const instant = false;
export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  await connection();
  const configured = isSupabaseConfigured();
  if (configured) {
    const session = await getAdminSession();
    if (session.status === "ok") redirect("/admin");
  }
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const forbidden = params.error === "forbidden";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-mist/60 px-4 py-12">
      <div aria-hidden className="hairline-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative w-full max-w-[400px]">
        <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Back to portfolio
        </Link>
        <div className="card p-7 sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-ink text-white">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Administrator sign in</h1>
          <p className="mt-1.5 text-sm text-muted">Manage the content of your portfolio.</p>

          {!configured ? (
            <div role="alert" className="mt-6 rounded-xl border border-warning/25 bg-warning/5 p-4 text-sm text-ink-2">
              <p className="font-semibold text-warning">Supabase is not configured</p>
              <p className="mt-1">
                Set <code className="font-mono text-[12.5px]">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="font-mono text-[12.5px]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>, run the
                migration, then create your administrator as described in the README. Sign-in is disabled until then.
              </p>
            </div>
          ) : (
            <>
              {forbidden && (
                <p role="alert" className="mt-6 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
                  This account does not have administrator access.
                </p>
              )}
              <LoginForm next={next} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
