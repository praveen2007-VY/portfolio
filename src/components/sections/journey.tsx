import { Briefcase, GraduationCap, MapPin } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState, Section } from "@/components/ui/section";
import { formatDateRange } from "@/lib/utils/format";
import type { PortfolioData } from "@/types/portfolio";

export function Journey({ data }: { data: PortfolioData }) {
  const { experiences, education, settings } = data;

  return (
    <Section id="experience" config={settings.sections.experience} tone="mist">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink">
            <Briefcase className="size-4 text-accent" aria-hidden /> Experience
          </h3>
          {experiences.length === 0 ? (
            <EmptyState title="Experience coming soon" />
          ) : (
            <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-px before:bg-gradient-to-b before:from-accent/50 before:via-line-strong before:to-transparent">
              {experiences.map((item, index) => (
                <li key={item.id} className="relative pl-10">
                  <span
                    aria-hidden
                    className="absolute top-6 left-0 grid size-6 place-items-center rounded-full border border-accent/30 bg-paper"
                  >
                    <span className="size-2 rounded-full bg-accent" />
                  </span>
                  <Reveal delay={index * 0.05}>
                    <article className="card group p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-7">
                      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                        <div>
                          <h4 className="text-lg font-semibold tracking-tight text-ink">{item.role}</h4>
                          <p className="mt-0.5 text-[15px] font-medium text-accent">{item.organization}</p>
                        </div>
                        <p className="rounded-full bg-mist px-3 py-1 font-mono text-[12px] text-ink-2">
                          {formatDateRange(item.start_date, item.end_date, item.is_current)}
                        </p>
                      </div>
                      {(item.location || item.employment_type) && (
                        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
                          {item.location && <MapPin className="size-3.5" aria-hidden />}
                          {[item.location, item.employment_type].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {item.summary && <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{item.summary}</p>}
                      {item.highlights.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {item.highlights.map((h, i) => (
                            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-ink-2">
                              <span aria-hidden className="mt-[10px] h-px w-3 shrink-0 bg-accent" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.technologies.length > 0 && (
                        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
                          {item.technologies.map((t) => (
                            <li key={t} className="chip bg-mist py-0.5 text-[12px]">
                              {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  </Reveal>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink">
            <GraduationCap className="size-4 text-accent" aria-hidden /> Education
          </h3>
          {education.length === 0 ? (
            <EmptyState title="Education details coming soon" />
          ) : (
            <div className="space-y-5">
              {education.map((item, index) => (
                <Reveal key={item.id} delay={0.08 + index * 0.05}>
                  <article className="relative overflow-hidden rounded-2xl border border-line bg-paper p-6 shadow-soft sm:p-7">
                    <div
                      aria-hidden
                      className="absolute -top-16 -right-16 size-48 rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.12),transparent_70%)]"
                    />
                    <p className="font-mono text-[12px] text-muted">
                      {formatDateRange(item.start_date, item.end_date)}
                    </p>
                    <h4 className="mt-2 text-lg leading-snug font-semibold tracking-tight text-ink">
                      {item.degree}
                      {item.field && <span className="block font-medium text-ink-2">{item.field}</span>}
                    </h4>
                    <p className="mt-2 text-[14.5px] text-muted">
                      {item.institution}
                      {item.location && <span className="block">{item.location}</span>}
                    </p>
                    {item.grade && (
                      <div className="mt-6 flex items-end gap-3 border-t border-line pt-5">
                        <p className="text-4xl font-semibold tracking-[-0.04em] text-ink tabular-nums">
                          {item.grade.split("/")[0]}
                          {item.grade.includes("/") && (
                            <span className="text-lg font-medium text-subtle">/{item.grade.split("/")[1]}</span>
                          )}
                        </p>
                        <p className="pb-1 text-[13px] font-medium text-muted">{item.grade_label ?? "Grade"}</p>
                      </div>
                    )}
                    {item.description && <p className="mt-4 text-[14.5px] text-ink-2">{item.description}</p>}
                    {item.coursework.length > 0 && (
                      <div className="mt-6">
                        <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">Coursework</p>
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {item.coursework.map((c) => (
                            <li key={c} className="chip py-0.5 text-[12px]">
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
