import { connection } from "next/server";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireAdminPage } from "@/lib/auth/admin";
import { listRows } from "@/lib/data/admin";
import { getUploadLimits } from "@/lib/uploads/server";

export const instant = false;
export const metadata = { title: "Experience" };

export default async function ExperiencePage({ searchParams }: PageProps<"/admin/experience">) {
  await connection();
  const { supabase } = await requireAdminPage("/admin/experience");
  const [rows, params] = await Promise.all([listRows(supabase, "experiences"), searchParams]);
  return (
    <>
      <ResourceManager resource="experiences" rows={rows} limits={getUploadLimits()} openNew={params.new === "1"} />
    </>
  );
}
