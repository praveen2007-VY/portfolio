import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProjectDetail } from "@/components/projects/project-detail";
import { requireAdminPage } from "@/lib/auth/admin";
import { getPreviewPortfolio } from "@/lib/data/portfolio";

export const instant = false;
export const metadata: Metadata = { title: "Project preview", robots: { index: false, follow: false } };

export default async function ProjectPreviewPage({ params }: PageProps<"/preview/projects/[slug]">) {
  await connection();
  const { supabase } = await requireAdminPage("/preview");
  const { slug } = await params;
  const data = await getPreviewPortfolio(supabase);
  const project = data.projects.find((p) => p.slug === slug);
  if (!project) notFound();
  return <ProjectDetail data={data} project={project} mode="preview" />;
}
