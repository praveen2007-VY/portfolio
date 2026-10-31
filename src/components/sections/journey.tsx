"use client";

import { useRef, useState } from "react";
import { motion, useScroll } from "framer-motion";
import { Award, Briefcase, Download, ExternalLink, GraduationCap, MapPin, X } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { EmptyState, Section } from "@/components/ui/section";
import { formatDateRange, formatPartialDate } from "@/lib/utils/format";
import type { PortfolioData } from "@/types/portfolio";

type CertificateViewerState = {
  title: string;
  organization: string;
  issueDate?: string | null;
  verificationUrl?: string | null;
  imageUrl?: string | null;
  pdfUrl?: string | null;
};

export function Journey({ data }: { data: PortfolioData }) {
  const { experiences, education, settings } = data;
  const timelineRef = useRef<HTMLOListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [viewingCert, setViewingCert] = useState<CertificateViewerState | null>(null);

  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 75%", "end 50%"],
  });

  function openViewer(cert: CertificateViewerState) {
    setViewingCert(cert);
    dialogRef.current?.showModal();
  }

  function closeViewer() {
    dialogRef.current?.close();
    setViewingCert(null);
  }

  return (
    <Section id="experience" config={settings.sections.experience} tone="paper">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
        <div>
          <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink">
            <Briefcase className="size-4 text-accent" aria-hidden /> Experience
          </h3>
          {experiences.length === 0 ? (
            <EmptyState title="Experience coming soon" />
          ) : (
            <ol ref={timelineRef} className="relative space-y-5">
              {/* Animated scroll-linked timeline rail */}
              <div
                aria-hidden
                className="absolute top-3 bottom-3 left-[11px] w-[2px] overflow-hidden rounded-full bg-line/70 dark:bg-white/10"
              >
                <motion.div
                  style={{ scaleY: scrollYProgress }}
                  className="h-full w-full origin-top bg-gradient-to-b from-accent via-[#3b82f6] to-[#60a5fa] shadow-[0_0_10px_rgba(31,69,224,0.45)] dark:from-sky-400 dark:via-blue-500 dark:to-cyan-400"
                />
              </div>

              {experiences.map((item, index) => {
                const hasCert = Boolean(
                  item.certificate_pdf_url ||
                    item.certificate_image_url ||
                    item.certificate_pdf_path ||
                    item.certificate_image_path ||
                    item.certificate_url,
                );
                const downloadUrl = item.certificate_pdf_url ?? item.certificate_image_url ?? item.certificate_url;

                return (
                  <li key={item.id} className="group relative pl-10">
                    {/* Milestone glowing node */}
                    <span
                      aria-hidden
                      className="absolute top-6 left-0 z-10 grid size-6 place-items-center rounded-full border border-accent/40 bg-paper transition-all duration-300 group-hover:scale-110 group-hover:border-accent group-hover:shadow-[0_0_12px_rgba(31,69,224,0.35)] dark:border-sky-400/40 dark:bg-paper dark:group-hover:border-sky-400"
                    >
                      <span className="size-2 rounded-full bg-accent transition-transform duration-300 group-hover:scale-125 dark:bg-sky-400" />
                    </span>
                    <Reveal delay={index * 0.06}>
                      <article className="card p-6 transition-all duration-500 hover:-translate-y-1 hover:border-accent/35 hover:shadow-lift dark:hover:border-sky-400/30 sm:p-7">
                        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                          <div>
                            <h4 className="text-lg font-semibold tracking-tight text-ink">{item.role}</h4>
                            <p className="mt-0.5 text-[15px] font-medium text-accent dark:text-sky-400">
                              {item.organization}
                            </p>
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
                                <span aria-hidden className="mt-[10px] h-px w-3 shrink-0 bg-accent dark:bg-sky-400" />
                                {h}
                              </li>
                            ))}
                          </ul>
                        )}
                        {item.technologies.length > 0 && (
                          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
                            {item.technologies.map((t) => (
                              <li
                                key={t}
                                className="chip bg-mist py-0.5 text-[12px] transition-colors hover:border-accent/30 hover:bg-accent-soft"
                              >
                                {t}
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Internship Certificate actions */}
                        {hasCert && (
                          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line/60 pt-4">
                            <button
                              type="button"
                              onClick={() =>
                                openViewer({
                                  title: item.certificate_title || `${item.role} Certificate`,
                                  organization: item.certificate_organization || item.organization,
                                  issueDate: item.certificate_date,
                                  verificationUrl: item.certificate_url,
                                  imageUrl: item.certificate_image_url,
                                  pdfUrl: item.certificate_pdf_url,
                                })
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-[13px] font-medium text-accent transition-all duration-300 hover:border-accent hover:bg-accent hover:text-white dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300 dark:hover:border-sky-400 dark:hover:bg-sky-400 dark:hover:text-[#0b0f17]"
                            >
                              <Award className="size-3.5" aria-hidden />
                              View Internship Certificate
                            </button>
                            {downloadUrl && (
                              <a
                                href={downloadUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-line bg-mist/60 px-3.5 py-1.5 text-[13px] font-medium text-ink-2 transition-all duration-300 hover:border-accent/40 hover:bg-mist hover:text-ink dark:border-white/10 dark:bg-white/5 dark:text-ink-2-dark dark:hover:border-sky-400/30 dark:hover:text-white"
                              >
                                <Download className="size-3.5" aria-hidden />
                                Download Certificate
                              </a>
                            )}
                          </div>
                        )}
                      </article>
                    </Reveal>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div>
          <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold text-ink">
            <GraduationCap className="size-4 text-accent dark:text-sky-400" aria-hidden /> Education
          </h3>
          {education.length === 0 ? (
            <EmptyState title="Education details coming soon" />
          ) : (
            <div className="space-y-5">
              {education.map((item, index) => (
                <Reveal key={item.id} delay={0.08 + index * 0.05}>
                  <article className="group relative overflow-hidden rounded-2xl border border-line bg-paper p-6 shadow-soft transition-all duration-500 hover:-translate-y-1 hover:border-accent/35 hover:shadow-lift dark:hover:border-sky-400/30 sm:p-7">
                    <div
                      aria-hidden
                      className="absolute -top-16 -right-16 size-48 rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.12),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
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
                            <li
                              key={c}
                              className="chip py-0.5 text-[12px] transition-colors hover:border-accent/30 hover:bg-accent-soft"
                            >
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

      {/* Internship Certificate Preview Modal */}
      <dialog
        ref={dialogRef}
        onClose={() => setViewingCert(null)}
        onClick={(e) => e.target === dialogRef.current && closeViewer()}
        aria-labelledby="internship-cert-title"
        className="m-auto h-[min(90dvh,850px)] w-[min(95vw,1000px)] max-w-none overflow-hidden rounded-2xl border border-line bg-paper p-0 shadow-lift backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {viewingCert && (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Award className="size-4 shrink-0 text-accent dark:text-sky-400" aria-hidden />
                  <h3 id="internship-cert-title" className="truncate font-semibold text-ink text-[15px] sm:text-base">
                    {viewingCert.title}
                  </h3>
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-muted">
                  {[viewingCert.organization, viewingCert.issueDate && formatPartialDate(viewingCert.issueDate)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {viewingCert.verificationUrl && (
                  <a
                    href={viewingCert.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-line bg-mist px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:border-accent/40 dark:hover:border-sky-400/40"
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                    Verify
                  </a>
                )}
                {(viewingCert.pdfUrl || viewingCert.imageUrl) && (
                  <a
                    href={viewingCert.pdfUrl ?? viewingCert.imageUrl ?? undefined}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-mist px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:border-accent/40 dark:hover:border-sky-400/40"
                  >
                    <Download className="size-3.5" aria-hidden />
                    Download
                  </a>
                )}
                <button
                  type="button"
                  onClick={closeViewer}
                  className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-mist hover:text-ink transition-colors"
                  aria-label="Close certificate preview"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            </div>

            {/* Viewer body */}
            <div className="relative flex-1 bg-mist/50 dark:bg-black/30 overflow-hidden">
              {viewingCert.pdfUrl ? (
                <iframe
                  src={viewingCert.pdfUrl}
                  title={`${viewingCert.title} (PDF)`}
                  className="size-full border-none"
                />
              ) : viewingCert.imageUrl ? (
                <div className="absolute inset-0 grid place-items-center overflow-auto p-4 sm:p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewingCert.imageUrl}
                    alt={`${viewingCert.title} certificate`}
                    className="max-h-full max-w-full rounded-lg object-contain shadow-soft"
                  />
                </div>
              ) : viewingCert.verificationUrl ? (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <Award className="size-12 text-accent dark:text-sky-400 mb-3" aria-hidden />
                  <p className="text-base font-semibold text-ink">{viewingCert.title}</p>
                  <p className="mt-1 text-sm text-muted">Issued by {viewingCert.organization}</p>
                  <a
                    href={viewingCert.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-sky-400 dark:text-black"
                  >
                    <ExternalLink className="size-4" aria-hidden /> View online credential
                  </a>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  No preview available
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>
    </Section>
  );
}
