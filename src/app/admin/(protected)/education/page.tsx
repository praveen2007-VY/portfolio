import { connection } from "next/server";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireAdminPage } from "@/lib/auth/admin";
import { listRows } from "@/lib/data/admin";
import { getUploadLimits } from "@/lib/uploads/server";

export const instant = false;
export const metadata = { title: "Education" };

export default async function EducationPage({ searchParams }: PageProps<"/admin/education">) {
  await connection();
  const { supabase } = await requireAdminPage("/admin/education");
  const [rows, params] = await Promise.all([listRows(supabase, "education"), searchParams]);
  return (
    <>
      <ResourceManager resource="education" rows={rows} limits={getUploadLimits()} openNew={params.new === "1"} />
    </>
  );
}
