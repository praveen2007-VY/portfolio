import Image from "next/image";
import { initials } from "@/lib/utils/format";
import type { PublicProject } from "@/types/portfolio";

/**
 * Project cover image, or a generated typographic cover when no image has
 * been uploaded yet (clearly decorative, not a fake screenshot).
 */
export function ProjectCover({
  project,
  sizes,
  priority = false,
}: {
  project: Pick<PublicProject, "title" | "cover_url" | "category" | "tech_stack">;
  sizes: string;
  priority?: boolean;
}) {
  if (project.cover_url) {
    return (
      <Image
        src={project.cover_url}
        alt={`${project.title} cover`}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
      />
    );
  }

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden bg-[#0a0d14] dark:bg-[#0c1426]">
      <div className="hairline-grid absolute inset-0 opacity-30 invert" />
      <div className="absolute -top-1/3 -right-1/4 size-[85%] rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.85),transparent_62%)] blur-2xl transition-transform duration-[1200ms] ease-out group-hover:translate-x-[-6%] group-hover:translate-y-[6%]" />
      <div className="absolute -bottom-1/3 -left-1/4 size-[70%] rounded-full bg-[radial-gradient(circle,rgb(90_162_255/0.45),transparent_65%)] blur-2xl" />
      <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
        <span className="font-mono text-[11px] tracking-[0.2em] text-white/60 uppercase">
          {project.category ?? "Project"}
        </span>
        <div>
          <span className="block font-mono text-[clamp(3rem,8vw,5.5rem)] leading-none font-semibold tracking-tighter text-white/95">
            {initials(project.title)}
          </span>
          {project.tech_stack.length > 0 && (
            <span className="mt-3 block truncate font-mono text-[12px] text-white/55">
              {project.tech_stack.slice(0, 4).join("  /  ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
