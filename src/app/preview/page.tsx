import type { Metadata } from "next";
import { connection } from "next/server";
import { PortfolioView } from "@/components/portfolio/portfolio-view";
import { requireAdminPage } from "@/lib/auth/admin";
import { getPreviewPortfolio } from "@/lib/data/portfolio";

export const instant = false;
export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default async function PreviewPage() {
  await connection();
  const { supabase } = await requireAdminPage("/preview");
  const data = await getPreviewPortfolio(supabase);
  return <PortfolioView data={data} mode="preview" />;
}
