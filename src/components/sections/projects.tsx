import { ProjectShowcase } from "@/components/showcase/project-showcase";
import { EmptyState, Section } from "@/components/ui/section";
import type { PortfolioData } from "@/types/portfolio";

export function Projects({ data, basePath }: { data: PortfolioData; basePath: string }) {
  const { settings, projects } = data;
  if (projects.length === 0) {
    return (
      <Section id="projects" config={settings.sections.projects}>
        <EmptyState title="Projects are on their way">New work will be published here soon.</EmptyState>
      </Section>
    );
  }
  return (
    <ProjectShowcase
      projects={projects}
      basePath={basePath}
      config={settings.sections.projects}
      enable3d={settings.enable_3d}
      reducedMotion={settings.animation_level === "reduced"}
    />
  );
}
