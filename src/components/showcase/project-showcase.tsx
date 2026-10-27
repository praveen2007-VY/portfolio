"use client";

import { useState } from "react";
import { ProjectGallery } from "@/components/showcase/gallery/project-gallery";
import { ProjectCarousel } from "@/components/showcase/project-carousel";
import { useShowcaseMode } from "@/components/showcase/use-showcase-mode";
import { ProjectCard } from "@/components/projects/project-card";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import type { PublicProject, SectionConfig } from "@/types/portfolio";

type ProjectShowcaseProps = {
  projects: PublicProject[];
  basePath: string;
  config: SectionConfig;
  enable3d: boolean;
  reducedMotion: boolean;
};

/**
 * Featured projects. Server-rendered as stacked cards; after hydration it
 * upgrades to the immersive 3D gallery where the device supports it, or to a
 * swipeable carousel on small screens. Falls back to cards if WebGL fails.
 */
export function ProjectShowcase({ projects, basePath, config, enable3d, reducedMotion }: ProjectShowcaseProps) {
  const mode = useShowcaseMode({ enable3d, reducedSetting: reducedMotion });
  const [sceneFailed, setSceneFailed] = useState(false);

  if ((mode === "gallery" || mode === "gallery-compact") && !sceneFailed) {
    return (
      <ProjectGallery
        projects={projects}
        basePath={basePath}
        config={config}
        compact={mode === "gallery-compact"}
        onFailure={() => setSceneFailed(true)}
      />
    );
  }

  const narrow = mode === "carousel" || mode === "gallery-compact";
  return (
    <Section id="projects" config={config}>
      {narrow ? (
        <ProjectCarousel projects={projects} basePath={basePath} label={config.title} />
      ) : (
        <div className="space-y-6" data-showcase-mode="list">
          {projects.map((project, index) => (
            <Reveal key={project.id}>
              <ProjectCard project={project} layout="feature" basePath={basePath} index={index} />
            </Reveal>
          ))}
        </div>
      )}
    </Section>
  );
}
