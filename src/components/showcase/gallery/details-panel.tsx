"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { formatDateRange } from "@/lib/utils/format";
import type { PublicProject } from "@/types/portfolio";

type DetailsPanelProps = {
  project: PublicProject;
  basePath: string;
  position: number;
  total: number;
  onClose: () => void;
  onStep: (delta: number) => void;
};

/** Accessible HTML details for the selected card (the 3D card itself stays concise). */
export const DetailsPanel = forwardRef<HTMLHeadingElement, DetailsPanelProps>(function DetailsPanel(
  { project, basePath, position, total, onClose, onStep },
  headingRef,
) {
  const dates = formatDateRange(project.start_date, project.end_date);
  const headingId = `gallery-details-${project.id}`;
  return (
    <aside
      aria-labelledby={headingId}
      data-testid="gallery-details"
      className="rounded-2xl border border-white/12 bg-[#0b1226]/80 p-6 text-white shadow-[0_40px_80px_-30px_rgb(0_0_0/0.8)] backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[11.5px] tracking-[0.18em] text-sky-300 uppercase">
          {project.category ?? "Project"}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close project details"
          className="-mt-1.5 -mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <h3
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="mt-2 text-[1.6rem] leading-tight font-semibold tracking-[-0.03em] text-balance outline-none"
      >
        {project.title}
      </h3>
      {dates && <p className="mt-1 font-mono text-[12px] text-white/50">{dates}</p>}
      {project.summary && <p className="mt-4 text-[15px] leading-relaxed text-white/75">{project.summary}</p>}
      {project.tech_stack.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
          {project.tech_stack.map((tech) => (
            <li key={tech} className="rounded-md bg-white/8 px-2 py-1 font-mono text-[11.5px] text-white/85">
              {tech}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={`${basePath}/projects/${project.slug}`}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-medium text-white shadow-[0_10px_30px_-12px_rgb(37_99_235/0.8)] transition-colors hover:bg-accent-strong"
        >
          View details <ArrowUpRight className="size-4" aria-hidden />
        </Link>
        {project.repo_url && (
          <a
            href={project.repo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <GitHubIcon size={15} /> GitHub
          </a>
        )}
        {project.demo_url && (
          <a
            href={project.demo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/15 px-3.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <ExternalLink className="size-3.5" aria-hidden /> Live demo
          </a>
        )}
      </div>
      {total > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-[12.5px] text-white/55">
          <span className="font-mono tabular-nums">
            {String(position + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="flex gap-1">
            <button
              type="button"
              onClick={() => onStep(-1)}
              aria-label="Previous project"
              className="grid size-8 place-items-center rounded-lg hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              aria-label="Next project"
              className="grid size-8 place-items-center rounded-lg hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </span>
        </div>
      )}
    </aside>
  );
});
