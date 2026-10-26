import { connection } from "next/server";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireAdminPage } from "@/lib/auth/admin";
import { listRows } from "@/lib/data/admin";
import { getUploadLimits } from "@/lib/uploads/server";

export const instant = false;
export const metadata = { title: "Achievements" };

export default async function AchievementsPage({ searchParams }: PageProps<"/admin/achievements">) {
  await connection();
  const { supabase } = await requireAdminPage("/admin/achievements");
  const [achievements, codingProfiles, params] = await Promise.all([
    listRows(supabase, "achievements"),
    listRows(supabase, "coding_profiles"),
    searchParams,
  ]);
  const limits = getUploadLimits();
  return (
    <>
      <ResourceManager resource="achievements" rows={achievements} limits={limits} openNew={params.new === "1"} />
      <div className="mt-14">
        <ResourceManager resource="coding_profiles" rows={codingProfiles} limits={limits} compact />
        <p className="mt-3 text-[13px] text-muted">
          The overall summary sentence shown next to these numbers is edited in Site settings.
        </p>
      </div>
    </>
  );
}
