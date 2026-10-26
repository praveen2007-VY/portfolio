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

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <span className="grid size-8 place-items-center rounded-lg bg-ink font-mono text-[11px] font-semibold text-white">CMS</span>
        <span className="text-[15px] font-semibold tracking-tight text-ink">Portfolio admin</span>
      </div>
      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                    active ? "bg-ink text-white" : "text-ink-2 hover:bg-mist hover:text-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="flex-1">{label}</span>
                  {href === "/admin/messages" && unread > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[11px] font-semibold",
                        active ? "bg-white/20 text-white" : "bg-accent text-white",
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
        <div className="mt-6 space-y-0.5 border-t border-line pt-4">
          <Link
            href="/preview"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
          >
            <ScanEye className="size-4" aria-hidden /> Preview drafts
          </Link>
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-mist hover:text-ink"
          >
            <ExternalLink className="size-4" aria-hidden /> View live site
          </a>
        </div>
      </nav>
      <div className="border-t border-line p-3">
        <p className="truncate px-3 pb-2 text-[12px] text-muted" title={email}>
          {email}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium text-ink-2 hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <FeedbackProvider>
      <div className="min-h-dvh bg-mist/50">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-paper lg:block">{sidebar}</aside>

        <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
          <span className="text-[15px] font-semibold tracking-tight">Portfolio admin</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="grid size-10 place-items-center rounded-lg hover:bg-mist"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
            <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 bg-paper shadow-lift">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute top-3 right-3 grid size-10 place-items-center rounded-lg hover:bg-mist"
              >
                <X className="size-5" aria-hidden />
              </button>
              {sidebar}
            </div>
          </div>
        )}

        <main id="admin-main" className="lg:pl-64">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
        </main>
      </div>
    </FeedbackProvider>
  );
}
