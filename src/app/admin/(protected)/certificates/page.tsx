import { connection } from "next/server";
import { ResourceManager } from "@/components/admin/resource-manager";
import { requireAdminPage } from "@/lib/auth/admin";
import { listRows } from "@/lib/data/admin";
import { getUploadLimits } from "@/lib/uploads/server";

export const instant = false;
export const metadata = { title: "Certificates" };

export default async function CertificatesPage({ searchParams }: PageProps<"/admin/certificates">) {
  await connection();
  const { supabase } = await requireAdminPage("/admin/certificates");
  const [rows, params] = await Promise.all([listRows(supabase, "certificates"), searchParams]);
  return (
    <>
      <ResourceManager resource="certificates" rows={rows} limits={getUploadLimits()} openNew={params.new === "1"} />
    </>
  );
}
