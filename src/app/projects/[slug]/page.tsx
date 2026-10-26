import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/components/projects/project-detail";
import { getPublishedPortfolio } from "@/lib/data/portfolio";

// Published projects are prerendered and refreshed through the 'portfolio'
// cache tag; newly published slugs render on demand. Unknown slugs show the
// not-found page with a noindex tag (the first on-demand render streams with
// status 200, later requests get the cached 404).
export async function generateStaticParams() {
  const { projects } = await getPublishedPortfolio();
  // Cache Components requires at least one param; a placeholder simply 404s.
  return projects.length ? projects.map((p) => ({ slug: p.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublishedPortfolio();
  const project = data.projects.find((p) => p.slug === slug);
  if (!project) return { title: "Project not found" };
  const title = `${project.title} — ${data.profile.full_name}`;
  return {
    title,
    description: project.summary ?? undefined,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title,
      description: project.summary ?? undefined,
      images: project.cover_url ? [{ url: project.cover_url }] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const { slug } = await params;
  const data = await getPublishedPortfolio();
  const project = data.projects.find((p) => p.slug === slug);
  if (!project) notFound();
  return <ProjectDetail data={data} project={project} mode="public" />;
}
