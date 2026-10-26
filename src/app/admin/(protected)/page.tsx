import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, Award, FileText, Plus, ScanEye, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdminPage } from "@/lib/auth/admin";
import { countUnreadMessages, getOverview, getProfileRow } from "@/lib/data/admin";
import { formatDateTime } from "@/lib/utils/format";

export const instant = false;
export const metadata = { title: "Overview" };

export default async function OverviewPage() {
  await connection();
  const { supabase } = await requireAdminPage("/admin");
  const [{ stats, recent }, profile, unread] = await Promise.all([
    getOverview(supabase),
    getProfileRow(supabase),
    countUnreadMessages(supabase),
  ]);
  const totals = stats.reduce(
    (acc, s) => ({ total: acc.total + s.total, published: acc.published + s.published }),
    { total: 0, published: 0 },
  );

  const quickActions = [
    { href: "/admin/projects?new=1", label: "New project", Icon: Plus },
    { href: "/admin/certificates?new=1", label: "Upload certificate", Icon: Award },
    { href: "/admin/profile#resume", label: profile?.resume_path ? "Replace resume" : "Upload resume", Icon: FileText },
    { href: "/admin/settings", label: "Edit site settings", Icon: Settings2 },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome back${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description="Everything on your public portfolio is managed here. Drafts stay private until you publish them."
        actions={
          <Link
            href="/preview"
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-paper px-4 text-sm font-medium text-ink shadow-soft hover:bg-mist"
          >
            <ScanEye className="size-4" aria-hidden /> Preview with drafts
          </Link>
        }
      />

      {!profile && (
        <p role="alert" className="mb-6 rounded-xl border border-warning/25 bg-warning/5 p-4 text-sm text-ink-2">
          The profile row is missing. Run <code className="font-mono">supabase/seed.sql</code> to create it.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-[13px] text-muted">Content items</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">{totals.total}</p>
        </div>
        <div className="card p-5">
          <p className="text-[13px] text-muted">Published · Draft/hidden</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {totals.published} <span className="text-xl text-subtle">· {totals.total - totals.published}</span>
          </p>
        </div>
        <Link href="/admin/messages" className="card group p-5 transition-colors hover:border-accent/30">
          <p className="text-[13px] text-muted">Unread messages</p>
          <p className="mt-1 flex items-center justify-between text-3xl font-semibold tracking-tight text-ink tabular-nums">
            {unread}
            <ArrowUpRight className="size-5 text-subtle group-hover:text-accent" aria-hidden />
          </p>
        </Link>
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold text-ink">Content</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card group p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
            <p className="flex items-center justify-between text-[13px] font-medium text-ink-2">
              {s.label}
              <ArrowUpRight className="size-4 text-subtle group-hover:text-accent" aria-hidden />
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">{s.total}</p>
            <p className="mt-1 text-[12.5px] text-muted">
              {s.published} published · {s.total - s.published} draft
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="mb-3 text-sm font-semibold text-ink">
            Recent updates
          </h2>
          <div className="card divide-y divide-line">
            {recent.length === 0 ? (
              <p className="p-5 text-sm text-muted">No content yet.</p>
            ) : (
              recent.map((r, i) => (
                <Link key={`${r.label}-${i}`} href={r.href} className="flex items-center gap-3 px-5 py-3.5 hover:bg-mist/60">
                  <span className="w-24 shrink-0 text-[12px] text-muted">{r.label}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{r.title}</span>
                  <span
                    className={`hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${
                      r.published ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}
                  >
                    {r.published ? "Published" : "Draft"}
                  </span>
                  <span className="hidden shrink-0 text-[12px] text-subtle md:inline">{formatDateTime(r.updatedAt)}</span>
                </Link>
              ))
            )}
          </div>
        </section>
        <section aria-labelledby="quick-title">
          <h2 id="quick-title" className="mb-3 text-sm font-semibold text-ink">
            Quick actions
          </h2>
          <div className="card divide-y divide-line">
            {quickActions.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-ink-2 hover:bg-mist/60 hover:text-ink">
                <Icon className="size-4 text-accent" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
