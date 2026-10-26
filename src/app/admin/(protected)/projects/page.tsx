import { connection } from "next/server";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireAdminPage } from "@/lib/auth/admin";
import { listRows } from "@/lib/data/admin";
import { getUploadLimits } from "@/lib/uploads/server";

export const instant = false;
export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/admin/projects">) {
  await connection();
  const { supabase } = await requireAdminPage("/admin/projects");
  const [rows, params] = await Promise.all([listRows(supabase, "projects"), searchParams]);
  return (
    <>
      <ResourceManager resource="projects" rows={rows} limits={getUploadLimits()} openNew={params.new === "1"} />
    </>
  );
}
