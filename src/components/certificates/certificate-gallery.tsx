"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BadgeCheck, ExternalLink, Eye, FileText, X } from "lucide-react";
import { useSound } from "@/components/portfolio/sound-provider";
import { buttonClasses } from "@/components/ui/button";
import { cn, formatPartialDate } from "@/lib/utils/format";
import type { PublicCertificate } from "@/types/portfolio";

const ALL = "All";

export function CertificateGallery({ certificates }: { certificates: PublicCertificate[] }) {
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of certificates) if (c.category) set.add(c.category);
    return [ALL, ...set];
  }, [certificates]);
  const [filter, setFilter] = useState(ALL);
  const [viewing, setViewing] = useState<PublicCertificate | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const { playSound } = useSound();

  const visible = filter === ALL ? certificates : certificates.filter((c) => c.category === filter);

  function open(cert: PublicCertificate) {
    playSound("open");
    setViewing(cert);
    dialog.current?.showModal();
  }

  function close() {
    playSound("close");
    dialog.current?.close();
  }

  return (
    <>
      {categories.length > 2 && (
        <div role="group" aria-label="Filter certificates by category" className="mb-8 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = category === filter;
            const count =
              category === ALL ? certificates.length : certificates.filter((c) => c.category === category).length;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(category)}
                className={cn(
                  "relative rounded-full px-4 py-2 text-[13.5px] font-medium transition-all duration-200",
                  active
                    ? "text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)] dark:text-[#0a0d14] dark:shadow-none"
                    : "border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 hover:shadow dark:border-transparent dark:bg-transparent dark:text-ink-2 dark:shadow-none dark:hover:bg-mist dark:hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="cert-filter"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:bg-none dark:bg-white"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 flex items-center">
                  {category}
                  <span
                    className={cn(
                      "ml-1.5 font-mono text-[11px]",
                      active
                        ? "text-white/80 dark:text-[#0a0d14]/70"
                        : "text-slate-400 dark:text-subtle",
                    )}
                  >
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <motion.ul layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((cert, index) => (
            <motion.li
              layout
              key={cert.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.55, delay: (index % 3) * 0.07, ease: [0.16, 1, 0.3, 1] }}
            >
              <CertificateCard cert={cert} onView={() => open(cert)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <dialog
        ref={dialog}
        onClose={() => setViewing(null)}
        onClick={(event) => event.target === dialog.current && close()}
        aria-labelledby="certificate-viewer-title"
        className="m-auto h-[min(88dvh,900px)] w-[min(96vw,1100px)] max-w-none overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-0 shadow-2xl backdrop:bg-ink/55 backdrop:backdrop-blur-sm dark:border-line dark:bg-paper"
      >
        {viewing && (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-6 dark:border-line dark:px-4 dark:py-3 sm:dark:px-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Award className="size-4 shrink-0 text-blue-600 dark:hidden" aria-hidden />
                  <h3 id="certificate-viewer-title" className="truncate font-semibold text-slate-900 dark:text-ink">
                    {viewing.title}
                  </h3>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-blue-600 dark:font-mono dark:text-[13px] dark:text-muted">
                  {[viewing.issuer, formatPartialDate(viewing.issue_date)].filter(Boolean).join(" · ")}
                </p>
              </div>
              {(viewing.pdf_url ?? viewing.image_url) && (
                <a
                  href={viewing.pdf_url ?? viewing.image_url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("secondary", "sm", "hidden sm:inline-flex border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 dark:border-line-strong dark:bg-paper dark:text-ink")}
                >
                  <ExternalLink className="size-3.5" aria-hidden /> Open in new tab
                </a>
              )}
              <button
                type="button"
                onClick={close}
                data-sound="none"
                className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-ink-2 dark:hover:bg-mist dark:hover:text-ink"
                aria-label="Close viewer"
                autoFocus
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="relative flex-1 bg-slate-50/60 dark:bg-mist">
              {viewing.pdf_url ? (
                <iframe
                  src={viewing.pdf_url}
                  title={`${viewing.title} (PDF)`}
                  className="absolute inset-0 size-full"
                />
              ) : viewing.image_url ? (
                <div className="absolute inset-0 grid place-items-center overflow-auto p-4 sm:p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element -- served through a signed-URL redirect */}
                  <img
                    src={viewing.image_url}
                    alt={`${viewing.title} certificate issued by ${viewing.issuer}`}
                    className="max-h-full max-w-full rounded-lg object-contain shadow-soft"
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}

function CertificateCard({ cert, onView }: { cert: PublicCertificate; onView: () => void }) {
  const hasFile = Boolean(cert.image_url || cert.pdf_url);
  return (
    <article className="group cert-card h-full">
      {/* Top radiant gradient accent bar for light mode */}
      <div
        aria-hidden
        className="h-1 w-full bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 dark:hidden"
      />

      {/* Light mode soft blue hover aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.18),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:hidden"
      />
      {/* Dark mode glow (exact original) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-52 rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.16),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100 hidden dark:block"
      />

      {/* Image frame */}
      <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-slate-100/90 via-slate-50 to-blue-50/20 dark:border-line dark:bg-paper">
        {cert.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- served through a signed-URL redirect
          <img
            src={cert.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-indigo-50/60 dark:bg-none dark:bg-[radial-gradient(ellipse_at_top,rgb(var(--accent-rgb)/0.15),transparent_70%)]"
          >
            <span className="relative grid size-16 place-items-center rounded-2xl border border-blue-100/80 bg-white text-blue-600 shadow-[0_4px_16px_rgba(37,99,235,0.1)] transition-all duration-300 group-hover:scale-105 group-hover:rotate-[-6deg] group-hover:border-blue-600 group-hover:bg-blue-600 group-hover:text-white dark:border-line dark:bg-accent-soft dark:text-accent dark:shadow-soft dark:group-hover:border-transparent dark:group-hover:bg-sky-400 dark:group-hover:text-[#070b16]">
              {cert.pdf_url ? <FileText className="size-7" /> : <Award className="size-7" />}
            </span>
          </div>
        )}

        {/* Refined category badge */}
        {cert.category && (
          <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-blue-200/90 bg-white/95 px-3 py-1 text-[11px] font-semibold text-blue-700 shadow-[0_2px_10px_rgba(37,99,235,0.14)] backdrop-blur-md dark:border-white/10 dark:bg-white/5 dark:px-2.5 dark:py-0.5 dark:text-[11.5px] dark:font-medium dark:text-ink-2 dark:shadow-none dark:backdrop-blur-xl">
            <span className="size-1.5 rounded-full bg-blue-600 dark:hidden" aria-hidden />
            {cert.category}
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-5 sm:p-6 dark:p-5">
        {/* Issuer and Date */}
        <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="font-semibold text-blue-600 dark:font-mono dark:text-[11.5px] dark:font-normal dark:text-muted">
            {cert.issuer}
          </span>
          {cert.issue_date && (
            <>
              <span className="text-slate-300 dark:text-muted/60" aria-hidden>·</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600 dark:bg-transparent dark:p-0 dark:text-[11.5px] dark:text-muted">
                {formatPartialDate(cert.issue_date)}
              </span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-2 text-[17.5px] font-bold tracking-tight text-slate-900 leading-snug transition-colors duration-200 group-hover:text-blue-600 dark:mt-1.5 dark:text-[16.5px] dark:font-semibold dark:text-ink dark:group-hover:text-ink">
          {cert.title}
        </h3>

        {/* Description */}
        {cert.description && (
          <p className="mt-2.5 line-clamp-3 text-[13.5px] leading-relaxed text-slate-600 dark:mt-2 dark:text-[14px] dark:text-muted">
            {cert.description}
          </p>
        )}

        {/* Expiry date if any */}
        {cert.expiry_date && (
          <p className="mt-2.5 text-[12px] text-slate-500 dark:mt-2 dark:text-[12.5px] dark:text-muted">
            Valid until {formatPartialDate(cert.expiry_date)}
          </p>
        )}

        {/* Credential ID */}
        {cert.credential_id && (
          <p className="mt-2 truncate font-mono text-[11.5px] text-slate-400 dark:text-subtle">
            ID: {cert.credential_id}
          </p>
        )}

        {/* Actions */}
        {(hasFile || cert.credential_url) && (
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5 border-t border-slate-100 dark:border-transparent">
            {hasFile && (
              <button
                type="button"
                onClick={onView}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-[12.5px] font-semibold text-white shadow-[0_4px_12px_rgba(37,99,235,0.28)] transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 hover:shadow-[0_6px_18px_rgba(37,99,235,0.38)] hover:-translate-y-0.5 active:scale-[0.98] dark:border-transparent dark:bg-accent-soft dark:bg-none dark:px-3.5 dark:py-1.5 dark:text-accent-strong dark:hover:border-transparent dark:hover:bg-accent/15 dark:hover:text-accent-strong dark:shadow-none dark:hover:shadow-none dark:hover:translate-y-0 dark:active:scale-100"
              >
                <Eye className="size-3.5" aria-hidden /> View
                <span className="sr-only"> {cert.title} certificate</span>
              </button>
            )}
            {cert.credential_url && (
              <a
                href={cert.credential_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/70 hover:text-blue-700 hover:shadow hover:-translate-y-0.5 active:scale-[0.98] dark:border-transparent dark:bg-transparent dark:py-1.5 dark:font-medium dark:text-ink-2 dark:shadow-none dark:hover:border-transparent dark:hover:bg-mist dark:hover:text-ink dark:hover:shadow-none dark:hover:translate-y-0 dark:active:scale-100"
              >
                <BadgeCheck className="size-3.5 text-blue-600 dark:text-inherit" aria-hidden /> Verify
                <span className="sr-only"> {cert.title} credential</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
