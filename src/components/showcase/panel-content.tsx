import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { ProjectCover } from "@/components/projects/project-cover";
import { buttonClasses } from "@/components/ui/button";
import { GitHubIcon } from "@/components/ui/icons";
import { cn, formatDateRange } from "@/lib/utils/format";
import type { PublicProject } from "@/types/portfolio";

const MAX_CHIPS = 5;

/** Project content shown on the front glass panel (desktop) and on mobile cards. */
export function PanelContent({
  project,
  basePath,
  layout,
  titleId,
  priority = false,
}: {
  project: PublicProject;
  basePath: string;
  layout: "split" | "stacked";
  titleId?: string;
  priority?: boolean;
}) {
  const href = `${basePath}/projects/${project.slug}`;
  const dates = formatDateRange(project.start_date, project.end_date);
  const chips = project.tech_stack.slice(0, MAX_CHIPS);
  const extraChips = project.tech_stack.length - chips.length;
  const split = layout === "split";

  return (
    <div className={cn("flex h-full min-h-0", split ? "gap-7 p-5 lg:gap-9 lg:p-6" : "flex-col")}>
      <div
        className={cn(
          "group relative shrink-0 overflow-hidden",
          split ? "w-[46%] rounded-2xl shadow-[0_18px_40px_-24px_rgb(16_24_40/0.45)]" : "aspect-[16/10] rounded-t-[20px]",
        )}
      >
        <ProjectCover
          project={project}
          sizes={split ? "(min-width: 1280px) 480px, 42vw" : "84vw"}
          priority={priority}
        />
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col", split ? "py-2 pr-2" : "p-5")}>
        <div className="flex items-center justify-between gap-3 font-mono text-[11.5px] text-muted">
          <span className="truncate tracking-wide uppercase">{project.category ?? "Project"}</span>
          {dates && <span className="shrink-0">{dates}</span>}
        </div>
        <h3
          id={titleId}
          className={cn(
            "mt-3 font-semibold tracking-[-0.035em] text-balance text-ink",
            split ? "text-[clamp(1.6rem,1rem+1.5vw,2.4rem)] leading-[1.05]" : "text-[1.4rem] leading-tight",
          )}
        >
          {project.title}
        </h3>
        {project.summary && (
          <p
            className={cn(
              "mt-3 leading-relaxed text-pretty text-ink-2",
              split ? "line-clamp-3 text-[15.5px]" : "line-clamp-3 text-[14.5px]",
            )}
          >
            {project.summary}
          </p>
        )}

        {project.features.length > 0 && (
          <ul className={cn("mt-4 space-y-1.5", !split && "hidden min-[380px]:block")}>
            {project.features.slice(0, 3).map((feature) => (
              <li key={feature} className="flex gap-3 text-[14px] text-ink-2">
                <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-accent" />
                <span className="line-clamp-1">{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {chips.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Technologies">
            {chips.map((tech) => (
              <li
                key={tech}
                className={cn(
                  "rounded-md px-2 py-1 font-mono text-[11.5px] text-ink-2",
                  split ? "border border-line/60 bg-paper/70 text-ink-2" : "bg-mist",
                )}
              >
                {tech}
              </li>
            ))}
            {extraChips > 0 && (
              <li className="rounded-md px-1.5 py-1 font-mono text-[11.5px] text-muted">+{extraChips}</li>
            )}
          </ul>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
          <Link href={href} className={buttonClasses("primary", split ? "md" : "sm", "group/link")}>
            View project details
            <ArrowUpRight
              className="size-4 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
              aria-hidden
            />
          </Link>
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", split ? "md" : "sm", "px-3")}
              aria-label={`${project.title} source code on GitHub`}
            >
              <GitHubIcon size={16} />
              <span className={split ? "" : "sr-only"}>GitHub</span>
            </a>
          )}
          {project.demo_url && (
            <a
              href={project.demo_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", split ? "md" : "sm")}
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Live demo
              <span className="sr-only"> of {project.title}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
