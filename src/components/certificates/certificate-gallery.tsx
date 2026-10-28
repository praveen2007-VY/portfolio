"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BadgeCheck, ExternalLink, Eye, FileText, X } from "lucide-react";
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

  const visible = filter === ALL ? certificates : certificates.filter((c) => c.category === filter);

  function open(cert: PublicCertificate) {
    setViewing(cert);
    dialog.current?.showModal();
  }

  function close() {
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
                  "relative rounded-full px-4 py-2 text-[13.5px] font-medium transition-colors",
                  active ? "text-white dark:text-[#0a0d14]" : "text-ink-2 hover:bg-mist",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="cert-filter"
                    className="absolute inset-0 rounded-full bg-ink dark:bg-white"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">
                  {category}
                  <span className={cn("ml-1.5 font-mono text-[11px]", active ? "text-white/60 dark:text-[#0a0d14]/70" : "text-subtle")}>
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <motion.ul layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        className="m-auto h-[min(88dvh,900px)] w-[min(96vw,1100px)] max-w-none overflow-hidden rounded-2xl border border-line bg-paper p-0 shadow-lift backdrop:bg-ink/55 backdrop:backdrop-blur-sm"
      >
        {viewing && (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <h3 id="certificate-viewer-title" className="truncate font-semibold text-ink">
                  {viewing.title}
                </h3>
                <p className="truncate text-[13px] text-muted">{viewing.issuer}</p>
              </div>
              {(viewing.pdf_url ?? viewing.image_url) && (
                <a
                  href={(viewing.pdf_url ?? viewing.image_url)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses("secondary", "sm", "hidden sm:inline-flex")}
                >
                  <ExternalLink className="size-3.5" aria-hidden /> Open in new tab
                </a>
              )}
              <button
                type="button"
                onClick={close}
                className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-mist"
                aria-label="Close viewer"
                autoFocus
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="relative flex-1 bg-mist">
              {viewing.pdf_url ? (
                <iframe
                  src={viewing.pdf_url}
                  title={`${viewing.title} (PDF)`}
                  className="absolute inset-0 size-full"
                />
              ) : viewing.image_url ? (
                <div className="absolute inset-0 grid place-items-center overflow-auto p-4">
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-accent/45 hover:shadow-lift dark:hover:border-sky-400/35">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-52 rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.16),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-paper">
        {cert.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- served through a signed-URL redirect
          <img
            src={cert.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div aria-hidden className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_top,rgb(var(--accent-rgb)/0.15),transparent_70%)]">
            <span className="relative grid size-16 place-items-center rounded-2xl border border-line bg-accent-soft text-accent shadow-soft transition-all duration-500 group-hover:scale-105 group-hover:rotate-[-6deg] group-hover:bg-accent group-hover:text-white dark:group-hover:bg-sky-400 dark:group-hover:text-[#070b16]">
              {cert.pdf_url ? <FileText className="size-7" /> : <Award className="size-7" />}
            </span>
          </div>
        )}
        {cert.category && (
          <span className="glass absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium text-ink-2">
            {cert.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="font-mono text-[11.5px] text-muted">
          {[cert.issuer, formatPartialDate(cert.issue_date)].filter(Boolean).join(" · ")}
        </p>
        <h3 className="mt-1.5 text-[16.5px] leading-snug font-semibold tracking-tight text-ink">{cert.title}</h3>
        {cert.description && <p className="mt-2 line-clamp-3 text-[14px] text-muted">{cert.description}</p>}
        {cert.expiry_date && (
          <p className="mt-2 text-[12.5px] text-muted">Valid until {formatPartialDate(cert.expiry_date)}</p>
        )}
        {cert.credential_id && (
          <p className="mt-2 truncate font-mono text-[11.5px] text-subtle">ID: {cert.credential_id}</p>
        )}
        {(hasFile || cert.credential_url) && (
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            {hasFile && (
              <button type="button" onClick={onView} className={buttonClasses("subtle", "sm")}>
                <Eye className="size-3.5" aria-hidden /> View
                <span className="sr-only"> {cert.title} certificate</span>
              </button>
            )}
            {cert.credential_url && (
              <a
                href={cert.credential_url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("ghost", "sm")}
              >
                <BadgeCheck className="size-3.5" aria-hidden /> Verify
                <span className="sr-only"> {cert.title} credential</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
