import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
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
    <main className="admin-shell relative grid min-h-dvh place-items-center overflow-hidden bg-[var(--admin-bg)] px-4 py-12 transition-colors duration-200">
      <div aria-hidden className="hairline-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      
      {/* Top Bar with Back Link & Theme Toggle */}
      <div className="absolute top-4 inset-x-4 max-w-5xl mx-auto flex items-center justify-between z-20">
        <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper/80 px-3 py-1.5 text-sm font-medium text-muted hover:text-ink hover:bg-mist backdrop-blur-sm transition-colors shadow-xs">
          <ArrowLeft className="size-4" aria-hidden /> Back to portfolio
        </Link>
        <ThemeToggle className="border border-line bg-paper/80 hover:bg-mist shadow-xs backdrop-blur-sm" />
      </div>

      <div className="relative w-full max-w-[400px]">
        <div className="card p-7 sm:p-8 shadow-lift">
          <span className="grid size-11 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
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
