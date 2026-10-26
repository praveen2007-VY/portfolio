import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/lib/auth/admin";
import { countUnreadMessages } from "@/lib/data/admin";

export const instant = false;
export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Portfolio admin" },
  robots: { index: false, follow: false },
};

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const { supabase, user } = await requireAdminPage();
  const unread = await countUnreadMessages(supabase);
  return (
    <AdminShell email={user.email ?? "Administrator"} unread={unread}>
      {children}
    </AdminShell>
  );
}
