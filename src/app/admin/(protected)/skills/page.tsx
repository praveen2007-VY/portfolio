import { connection } from "next/server";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireAdminPage } from "@/lib/auth/admin";
import { listRows } from "@/lib/data/admin";
import { getUploadLimits } from "@/lib/uploads/server";

export const instant = false;
export const metadata = { title: "Skills" };

export default async function SkillsPage({ searchParams }: PageProps<"/admin/skills">) {
  await connection();
  const { supabase } = await requireAdminPage("/admin/skills");
  const [rows, params] = await Promise.all([listRows(supabase, "skills"), searchParams]);
  return (
    <>
      <ResourceManager resource="skills" rows={rows} limits={getUploadLimits()} openNew={params.new === "1"} />
    </>
  );
}
