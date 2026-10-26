import { ProjectCard } from "@/components/projects/project-card";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState, Section } from "@/components/ui/section";
import type { PortfolioData } from "@/types/portfolio";

export function Projects({ data, basePath }: { data: PortfolioData; basePath: string }) {
  const featured = data.projects.filter((p) => p.is_featured);
  const rest = data.projects.filter((p) => !p.is_featured);

  return (
    <Section id="projects" config={data.settings.sections.projects}>
      {data.projects.length === 0 ? (
        <EmptyState title="Projects are on their way">New work will be published here soon.</EmptyState>
      ) : (
        <div className="space-y-6">
          {featured.map((project, index) => (
            <Reveal key={project.id}>
              <ProjectCard project={project} layout="feature" basePath={basePath} index={index} />
            </Reveal>
          ))}
          {rest.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {rest.map((project, index) => (
                <Reveal key={project.id} delay={(index % 2) * 0.08} className="h-full">
                  <ProjectCard
                    project={project}
                    layout="grid"
                    basePath={basePath}
                    index={featured.length + index}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
