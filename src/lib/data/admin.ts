import "server-only";
import type { AdminSupabase } from "@/lib/auth/admin";
import type { ContactMessageRow, ProfileRow, SiteSettingsRow } from "@/types/portfolio";
import type { Row } from "@/components/admin/resource-configs";

function fail(what: string, error: { message: string }): never {
  console.error(`[admin] failed to load ${what}:`, error);
  throw new Error(`Could not load ${what}. Check the database connection and migrations.`);
}

export async function listRows(supabase: AdminSupabase, table: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) fail(table, error);
  return (data ?? []) as Row[];
}

export async function getProfileRow(supabase: AdminSupabase): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").limit(1).maybeSingle();
  if (error) fail("profile", error);
  return data as ProfileRow | null;
}

export async function getSettingsRows(supabase: AdminSupabase) {
  const { data, error } = await supabase.from("site_settings").select("*");
  if (error) fail("site settings", error);
  const rows = (data ?? []) as SiteSettingsRow[];
  return {
    draft: rows.find((r) => r.variant === "draft") ?? null,
    published: rows.find((r) => r.variant === "published") ?? null,
  };
}

export async function getMessages(supabase: AdminSupabase): Promise<ContactMessageRow[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) fail("messages", error);
  return (data ?? []) as ContactMessageRow[];
}

export async function countUnreadMessages(supabase: AdminSupabase): Promise<number> {
  const { count, error } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

const OVERVIEW_TABLES = [
  { table: "projects", label: "Projects", title: "title", href: "/admin/projects" },
  { table: "certificates", label: "Certificates", title: "title", href: "/admin/certificates" },
  { table: "achievements", label: "Achievements", title: "title", href: "/admin/achievements" },
  { table: "skills", label: "Skills", title: "name", href: "/admin/skills" },
  { table: "experiences", label: "Experience", title: "role", href: "/admin/experience" },
  { table: "education", label: "Education", title: "degree", href: "/admin/education" },
  { table: "coding_profiles", label: "Coding profiles", title: "platform", href: "/admin/achievements" },
] as const;

export type OverviewStat = { label: string; href: string; total: number; published: number };
export type RecentUpdate = { label: string; title: string; href: string; updatedAt: string; published: boolean };

export async function getOverview(supabase: AdminSupabase) {
  const results = await Promise.all(
    OVERVIEW_TABLES.map(async (t) => {
      const { data, error } = await supabase
        .from(t.table)
        .select(`id, ${t.title}, is_published, updated_at`)
        .order("updated_at", { ascending: false });
      if (error) fail(t.table, error);
      const rows = (data ?? []) as unknown as Record<string, unknown>[];
      return { t, rows };
    }),
  );

  const stats: OverviewStat[] = results.map(({ t, rows }) => ({
    label: t.label,
    href: t.href,
    total: rows.length,
    published: rows.filter((r) => r.is_published).length,
  }));

  const recent: RecentUpdate[] = results
    .flatMap(({ t, rows }) =>
      rows.slice(0, 6).map((r) => ({
        label: t.label,
        title: String(r[t.title] ?? "Untitled"),
        href: t.href,
        updatedAt: String(r.updated_at),
        published: Boolean(r.is_published),
      })),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8);

  return { stats, recent };
}
