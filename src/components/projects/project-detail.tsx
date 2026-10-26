import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ExternalLink, PlayCircle } from "lucide-react";
import { MotionProvider } from "@/components/portfolio/motion-provider";
import { PreviewBanner } from "@/components/portfolio/notices";
import { ProjectCover } from "@/components/projects/project-cover";
import { buttonClasses } from "@/components/ui/button";
import { GitHubIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/reveal";
import { formatDateRange, paragraphs } from "@/lib/utils/format";
import type { PortfolioData, PublicProject } from "@/types/portfolio";

type Props = { data: PortfolioData; project: PublicProject; mode: "public" | "preview" };

export function ProjectDetail({ data, project, mode }: Props) {
  const base = mode === "preview" ? "/preview" : "";
  const index = data.projects.findIndex((p) => p.id === project.id);
  const next = data.projects.length > 1 ? data.projects[(index + 1) % data.projects.length] : null;
  const dates = formatDateRange(project.start_date, project.end_date);

  return (
    <MotionProvider reduced={data.settings.animation_level === "reduced"}>
      <div data-accent={data.settings.accent} className="min-h-dvh overflow-x-clip">
        <header className="sticky top-0 z-40 border-b border-line/80 bg-white/80 backdrop-blur-xl">
          <div className="container-page flex h-16 items-center justify-between">
            <Link href={`${base}/#projects`} className={buttonClasses("ghost", "sm", "-ml-3")}>
              <ArrowLeft className="size-4" aria-hidden /> All projects
            </Link>
            <Link href={`${base}/`} className="text-[15px] font-semibold tracking-tight text-ink">
              {data.profile.full_name}
            </Link>
          </div>
        </header>

        <main id="main" className="pb-24">
          <article>
            <div className="container-page pt-12 sm:pt-16">
              <Reveal>
                <p className="eyebrow">
                  <span aria-hidden className="h-px w-6 bg-accent/60" />
                  {project.category ?? "Project"}
                  {!project.is_published && (
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">Draft</span>
                  )}
                </p>
                <h1 className="mt-4 max-w-4xl text-[clamp(2.2rem,1.4rem+3.4vw,4rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance text-ink">
                  {project.title}
                </h1>
                {project.summary && (
                  <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted">{project.summary}</p>
                )}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {project.demo_url && (
                    <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className={buttonClasses("primary", "lg")}>
                      <ExternalLink className="size-4" aria-hidden /> Live demo
                    </a>
                  )}
                  {project.repo_url && (
                    <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "lg")}>
                      <GitHubIcon size={16} /> Source code
                    </a>
                  )}
                  {project.video_url && (
                    <a href={project.video_url} target="_blank" rel="noopener noreferrer" className={buttonClasses("ghost", "lg")}>
                      <PlayCircle className="size-4" aria-hidden /> Video / presentation
                    </a>
                  )}
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.08} className="container-page mt-12">
              <div className="group relative aspect-[16/9] overflow-hidden rounded-3xl border border-line shadow-lift">
                <ProjectCover project={project} sizes="(min-width: 1200px) 1150px, 100vw" priority />
              </div>
            </Reveal>

            <div className="container-page mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-12">
                {project.description && (
                  <section aria-labelledby="overview">
                    <h2 id="overview" className="text-xl font-semibold tracking-tight text-ink">
                      Overview
                    </h2>
                    <div className="mt-4 space-y-4 text-[17px] leading-[1.75] text-ink-2">
                      {paragraphs(project.description).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </section>
                )}
                {(project.problem || project.solution) && (
                  <div className="grid gap-4 md:grid-cols-2">
                    {project.problem && (
                      <section aria-labelledby="problem" className="card p-6">
                        <h2 id="problem" className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
                          Problem
                        </h2>
                        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{project.problem}</p>
                      </section>
                    )}
                    {project.solution && (
                      <section aria-labelledby="solution" className="card p-6">
                        <h2 id="solution" className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
                          Solution
                        </h2>
                        <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{project.solution}</p>
                      </section>
                    )}
                  </div>
                )}
                {project.features.length > 0 && (
                  <section aria-labelledby="features">
                    <h2 id="features" className="text-xl font-semibold tracking-tight text-ink">
                      Key features
                    </h2>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                      {project.features.map((f, i) => (
                        <li key={i} className="flex gap-3 rounded-xl border border-line bg-paper p-4 text-[15px] text-ink-2">
                          <span className="font-mono text-[12px] text-accent">{String(i + 1).padStart(2, "0")}</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {project.screenshot_urls.length > 0 && (
                  <section aria-labelledby="screenshots">
                    <h2 id="screenshots" className="text-xl font-semibold tracking-tight text-ink">
                      Screenshots
                    </h2>
                    <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                      {project.screenshot_urls.map((url, i) => (
                        <li key={url} className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-mist">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="group block size-full">
                            <Image
                              src={url}
                              alt={`${project.title} screenshot ${i + 1}`}
                              fill
                              sizes="(min-width: 640px) 50vw, 100vw"
                              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                <dl className="card divide-y divide-line">
                  {dates && (
                    <div className="p-5">
                      <dt className="text-[12.5px] text-muted">Timeline</dt>
                      <dd className="mt-1 font-medium text-ink">{dates}</dd>
                    </div>
                  )}
                  {project.category && (
                    <div className="p-5">
                      <dt className="text-[12.5px] text-muted">Category</dt>
                      <dd className="mt-1 font-medium text-ink">{project.category}</dd>
                    </div>
                  )}
                  {project.tech_stack.length > 0 && (
                    <div className="p-5">
                      <dt className="text-[12.5px] text-muted">Technology</dt>
                      <dd className="mt-3 flex flex-wrap gap-1.5">
                        {project.tech_stack.map((t) => (
                          <span key={t} className="rounded-md bg-mist px-2 py-1 font-mono text-[12px] text-ink-2">
                            {t}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
                {!project.repo_url && !project.demo_url && (
                  <p className="text-[13.5px] leading-relaxed text-muted">
                    Source code and a live demo aren&apos;t public for this project yet.
                  </p>
                )}
              </aside>
            </div>
          </article>

          {next && next.id !== project.id && (
            <div className="container-page mt-24">
              <Link
                href={`${base}/projects/${next.slug}`}
                className="group flex items-center justify-between gap-6 rounded-3xl border border-line bg-mist p-8 transition-colors hover:bg-haze sm:p-10"
              >
                <span>
                  <span className="block font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Next project</span>
                  <span className="mt-2 block text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{next.title}</span>
                </span>
                <ArrowRight className="size-6 text-accent transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>
          )}
        </main>
        {mode === "preview" && <PreviewBanner />}
      </div>
    </MotionProvider>
  );
}
