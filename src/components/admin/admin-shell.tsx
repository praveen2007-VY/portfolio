"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BriefcaseBusiness,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  ScanEye,
  Settings2,
  Sparkles,
  Trophy,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { FeedbackProvider } from "@/components/admin/feedback";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/format";

const NAV = [
  { href: "/admin", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/profile", label: "Profile", Icon: UserRound },
  { href: "/admin/projects", label: "Projects", Icon: Sparkles },
  { href: "/admin/certificates", label: "Certificates", Icon: Award },
  { href: "/admin/achievements", label: "Achievements", Icon: Trophy },
  { href: "/admin/skills", label: "Skills", Icon: Wrench },
  { href: "/admin/experience", label: "Experience", Icon: BriefcaseBusiness },
  { href: "/admin/education", label: "Education", Icon: GraduationCap },
  { href: "/admin/messages", label: "Messages", Icon: Mail },
  { href: "/admin/settings", label: "Site settings", Icon: Settings2 },
];

export function AdminShell({
  email,
  unread,
  children,
}: {
  email: string;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentNav = NAV.find(({ href }) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href),
  );

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-3 border-b border-[var(--admin-sidebar-border)] px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-slate-900 font-mono text-[11px] font-bold text-white shadow-sm ring-1 ring-slate-900/10 dark:border dark:border-blue-500/30 dark:bg-[#111827] dark:text-white dark:ring-1 dark:ring-blue-500/30">
          CMS
        </span>
        <div className="flex flex-col">
          <span className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Portfolio admin
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Content Studio
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-3">
        <ul className="space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-200",
                    active
                      ? "bg-blue-50 text-blue-600 shadow-xs dark:border-l-2 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-400 dark:shadow-none"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300",
                    )}
                    aria-hidden
                  />
                  <span className="flex-1">{label}</span>
                  {href === "/admin/messages" && unread > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
                        active
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                          : "bg-blue-600 text-white",
                      )}
                    >
                      {unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* External / Preview Links */}
        <div className="mt-6 space-y-1 border-t border-[var(--admin-sidebar-border)] pt-4">
          <Link
            href="/preview"
            target="_blank"
            className="group flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 transition-colors"
          >
            <ScanEye className="size-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" aria-hidden />
            <span>Preview drafts</span>
          </Link>
          <a
            href="/"
            target="_blank"
            className="group flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100 transition-colors"
          >
            <ExternalLink className="size-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" aria-hidden />
            <span>View live site</span>
          </a>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-[var(--admin-sidebar-border)] p-3 space-y-2">
        <div className="flex items-center justify-between px-3 py-1">
          <p className="truncate text-[12px] text-slate-500 dark:text-slate-400" title={email}>
            {email}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
          >
            <LogOut className="size-4 shrink-0" aria-hidden />
            <span>Log out</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <FeedbackProvider>
      <div className="admin-shell min-h-dvh">
        {/* Desktop Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] lg:block">
          {sidebar}
        </aside>

        {/* Mobile Header Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--admin-sidebar-border)] bg-[var(--admin-header-bg)] px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-lg bg-slate-900 font-mono text-[10px] font-bold text-white dark:border dark:border-blue-500/30 dark:bg-[#111827] dark:text-white">
              CMS
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Portfolio admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="border border-line bg-paper hover:bg-mist" />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-expanded={open}
              className="grid size-10 place-items-center rounded-xl border border-line bg-paper text-ink-2 hover:bg-mist hover:text-ink transition-colors"
            >
              <Menu className="size-5" aria-hidden />
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72 bg-[var(--admin-sidebar-bg)] border-r border-[var(--admin-sidebar-border)] shadow-lift">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-mist hover:text-ink transition-colors"
              >
                <X className="size-5" aria-hidden />
              </button>
              {sidebar}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main id="admin-main" className="lg:pl-64 flex flex-col min-h-dvh">
          {/* Desktop Top Header Bar */}
          <header className="sticky top-0 z-30 hidden lg:flex h-16 items-center justify-between border-b border-[var(--admin-sidebar-border)] bg-[var(--admin-header-bg)] px-8 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)]">
              <span>Admin</span>
              <span>/</span>
              <span className="font-medium text-[var(--admin-text)]">
                {currentNav?.label ?? "Dashboard"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/preview"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-[13px] font-medium text-ink-2 shadow-sm hover:bg-mist hover:text-ink transition-colors"
                title="Preview portfolio with drafts"
              >
                <ScanEye className="size-3.5" aria-hidden />
                <span>Preview drafts</span>
              </Link>
              <a
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-[13px] font-medium text-ink-2 shadow-sm hover:bg-mist hover:text-ink transition-colors"
                title="Open live site in new tab"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                <span>Live site</span>
              </a>
              <div className="h-4 w-px bg-line" aria-hidden />
              <ThemeToggle className="border border-line bg-paper hover:bg-mist shadow-sm" />
            </div>
          </header>

          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10 flex-1">
            {children}
          </div>
        </main>
      </div>
    </FeedbackProvider>
  );
}
