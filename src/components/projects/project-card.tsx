import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { ImageReveal } from "@/components/projects/image-reveal";
import { ProjectCover } from "@/components/projects/project-cover";
import { TiltCard } from "@/components/projects/tilt-card";
import { GitHubIcon } from "@/components/ui/icons";
import { cn, formatDateRange } from "@/lib/utils/format";
import type { PublicProject } from "@/types/portfolio";

type ProjectCardProps = {
  project: PublicProject;
  layout: "feature" | "grid";
  basePath: string;
  index: number;
};

export function ProjectCard({ project, layout, basePath, index }: ProjectCardProps) {
  const href = `${basePath}/projects/${project.slug}`;
  const feature = layout === "feature";
  const dates = formatDateRange(project.start_date, project.end_date);

  return (
    <TiltCard className="group relative h-full rounded-[22px] [transform-style:preserve-3d]">
      <article
        className={cn(
          "relative flex h-full overflow-hidden rounded-[22px] border border-line bg-paper shadow-soft transition-shadow duration-500 group-hover:shadow-lift",
          feature ? "flex-col lg:grid lg:grid-cols-[1.25fr_1fr]" : "flex-col",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden",
            feature ? "aspect-[16/10] lg:aspect-auto lg:min-h-[420px]" : "aspect-[16/10]",
          )}
        >
          <ImageReveal className="absolute inset-0">
            <ProjectCover
              project={project}
              sizes={feature ? "(min-width: 1024px) 680px, 100vw" : "(min-width: 768px) 560px, 100vw"}
              priority={index === 0}
            />
          </ImageReveal>
          {project.is_featured && (
            <span className="glass absolute top-4 right-4 rounded-full px-3 py-1 text-[12px] font-semibold text-ink shadow-soft">
              Featured
            </span>
          )}
        </div>

        <div className={cn("flex flex-1 flex-col p-6 sm:p-7", feature && "lg:p-10")}>
          <div className="flex items-center justify-between gap-3 font-mono text-[11.5px] text-muted">
            <span className="truncate tracking-wide uppercase">{project.category}</span>
            {dates && <span className="shrink-0">{dates}</span>}
          </div>
          <h3
            className={cn(
              "mt-3 font-semibold tracking-[-0.03em] text-ink",
              feature ? "text-[clamp(1.6rem,1.2rem+1.4vw,2.25rem)] leading-[1.08]" : "text-xl leading-snug",
            )}
          >
            <Link href={href} className="outline-none after:absolute after:inset-0 after:content-['']">
              {project.title}
            </Link>
          </h3>
          {project.summary && (
            <p className={cn("mt-3 leading-relaxed text-pretty text-muted", feature ? "text-[16px]" : "text-[15px]")}>
              {project.summary}
            </p>
          )}

          {feature && project.features.length > 0 && (
            <ul className="mt-5 hidden space-y-2 sm:block">
              {project.features.slice(0, 4).map((f) => (
                <li key={f} className="flex gap-3 text-[14.5px] text-ink-2">
                  <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-accent" />
                  {f}
                </li>
              ))}
            </ul>
          )}

          {project.tech_stack.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
              {project.tech_stack.map((t) => (
                <li key={t} className="rounded-md bg-mist px-2 py-1 font-mono text-[11.5px] text-ink-2">
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-6">
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-lg py-1.5 text-sm font-semibold text-accent"
            >
              View project details
              <ArrowUpRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                aria-hidden
              />
            </Link>
            <span className="flex-1" />
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-9 place-items-center rounded-lg border border-line text-ink-2 transition-colors hover:border-ink/25 hover:text-ink"
                aria-label={`${project.title} source code on GitHub`}
              >
                <GitHubIcon size={16} />
              </a>
            )}
            {project.demo_url && (
              <a
                href={project.demo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium text-ink-2 transition-colors hover:border-ink/25 hover:text-ink"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                Live demo
              </a>
            )}
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
