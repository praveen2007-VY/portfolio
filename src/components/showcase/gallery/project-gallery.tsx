"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { Hand, MousePointerClick, RotateCcw, ScrollText } from "lucide-react";
import { DetailsPanel } from "@/components/showcase/gallery/details-panel";
import type { GalleryCard } from "@/components/showcase/gallery/gallery-scene";
import { cn } from "@/lib/utils/format";
import type { PublicProject, SectionConfig } from "@/types/portfolio";

const GalleryScene = dynamic(() => import("@/components/showcase/gallery/gallery-scene"), { ssr: false });

/** If WebGL fails at runtime, report it so the section can fall back to HTML cards. */
class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[gallery] 3D scene failed, falling back to cards:", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type ProjectGalleryProps = {
  projects: PublicProject[];
  basePath: string;
  config: SectionConfig;
  compact: boolean;
  onFailure: () => void;
};

export function ProjectGallery({ projects, basePath, config, compact, onFailure }: ProjectGalleryProps) {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const railButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const panelHeading = useRef<HTMLHeadingElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const reduced = useReducedMotion();
  const n = projects.length;

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4, restDelta: 0.0005 });
  const headerOpacity = useTransform(progress, [0.85, 1], [1, 0]);

  const featuredIndex = Math.max(0, projects.findIndex((p) => p.is_featured));
  const cards: GalleryCard[] = useMemo(
    () =>
      projects.map((p, i) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        summary: p.summary,
        tech: p.tech_stack,
        featured: i === featuredIndex,
        coverUrl: p.cover_url,
      })),
    [projects, featuredIndex],
  );

  // Mount the scene shortly before the section arrives; render only while visible.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const nearObserver = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    const visibleObserver = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    nearObserver.observe(el);
    visibleObserver.observe(el);
    return () => {
      nearObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, []);

  const select = useCallback((index: number | null) => setSelected(index), []);
  const markInteracted = useCallback(() => setInteracted(true), []);

  // Closing returns focus to the project's button in the index.
  const close = useCallback(() => {
    if (selected !== null) {
      const button = railButtons.current[selected];
      requestAnimationFrame(() => button?.focus({ preventScroll: true }));
    }
    setSelected(null);
  }, [selected]);

  const step = useCallback(
    (delta: number) => setSelected((current) => (((current ?? (delta > 0 ? -1 : 0)) + delta + n) % n)),
    [n],
  );

  // Escape closes the panel from anywhere while it is open.
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, close]);

  function onStageKey(e: React.KeyboardEvent) {
    if (e.target !== stage.current) return;
    if (e.key === "ArrowRight") step(1);
    else if (e.key === "ArrowLeft") step(-1);
    else return;
    e.preventDefault();
    setInteracted(true);
  }

  const project = selected !== null ? projects[selected] : null;

  return (
    <section
      id="projects"
      aria-labelledby="projects-heading"
      data-showcase-mode="gallery"
      className="relative bg-[#070b16] text-white"
    >
      {/* Light → dark: the section opens into the immersive scene deliberately. */}
      <div aria-hidden className="h-48 bg-[linear-gradient(to_bottom,var(--color-paper)_0%,#dfe5f2_18%,#26324f_62%,#070b16_100%)]" />

      <div ref={track} className="relative" style={{ height: compact ? "200vh" : "260vh" }}>
        <div
          ref={stage}
          className="sticky top-0 h-[100svh] touch-pan-y overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 focus-visible:ring-inset"
          role="region"
          aria-roledescription="3D project gallery"
          aria-label={`${config.title}. Use the project list or the left and right arrow keys to select a project.`}
          tabIndex={0}
          onKeyDown={onStageKey}
          data-testid="gallery-stage"
        >
          <div className="absolute inset-0" data-testid="gallery-canvas">
            {near && (
              <SceneBoundary onError={onFailure}>
                <GalleryScene
                  cards={cards}
                  featuredIndex={featuredIndex}
                  progress={progress}
                  selected={selected}
                  onSelect={select}
                  onInteract={markInteracted}
                  resetToken={resetToken}
                  running={visible}
                  compact={compact}
                  animate={!reduced}
                  stateTarget={stage}
                />
              </SceneBoundary>
            )}
          </div>

          {/* Edge vignette keeps overlay text legible without dimming the scene centre. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_50%_45%,transparent_55%,rgb(7_11_22/0.85))]"
          />

          {/* Heading and hints */}
          <motion.div
            style={{ opacity: headerOpacity }}
            className="pointer-events-none absolute inset-x-0 top-0 pt-24 sm:pt-28"
          >
            <div className="container-page">
              {config.eyebrow && (
                <p className="inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] text-sky-300 uppercase">
                  <span aria-hidden className="h-px w-6 bg-sky-300/60" />
                  {config.eyebrow}
                </p>
              )}
              <h2
                id="projects-heading"
                className="mt-3 max-w-xl text-[clamp(2rem,1.2rem+2.6vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance"
              >
                {config.title}
              </h2>
              {config.description && !compact && (
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/60">{config.description}</p>
              )}
              <ul
                className={cn(
                  "mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-white/55 transition-opacity duration-700",
                  interacted && "opacity-0",
                )}
                aria-label="How to explore"
              >
                <li className="flex items-center gap-1.5">
                  <Hand className="size-3.5" aria-hidden /> {compact ? "Swipe sideways to rotate" : "Drag to rotate or move cards"}
                </li>
                <li className="flex items-center gap-1.5">
                  <MousePointerClick className="size-3.5" aria-hidden /> {compact ? "Tap" : "Click"} a project for details
                </li>
                <li className="flex items-center gap-1.5">
                  <ScrollText className="size-3.5" aria-hidden /> Scroll to move through
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Details panel */}
          <div
            className={cn(
              "pointer-events-none absolute z-20",
              compact ? "inset-x-3 bottom-[4.75rem]" : "top-1/2 right-6 w-[380px] -translate-y-1/2 xl:right-10",
            )}
          >
            <AnimatePresence mode="wait">
              {project && (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: compact ? 0 : 24, y: compact ? 16 : 0 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: compact ? 0 : 16, y: compact ? 12 : 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className={cn("pointer-events-auto", compact && "max-h-[46svh] overflow-y-auto rounded-2xl")}
                >
                  <DetailsPanel
                    ref={panelHeading}
                    project={project}
                    basePath={basePath}
                    position={selected!}
                    total={n}
                    onClose={close}
                    onStep={step}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <p className="sr-only" aria-live="polite">
            {project ? `Selected project ${selected! + 1} of ${n}: ${project.title}` : ""}
          </p>

          {/* Project index and reset */}
          <div className="absolute inset-x-0 bottom-0 z-10 pb-5">
            <div className="container-page flex items-end justify-between gap-4">
              <div role="group" aria-label="Projects" className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
                {projects.map((p, i) => (
                  <button
                    key={p.id}
                    ref={(el) => {
                      railButtons.current[i] = el;
                    }}
                    type="button"
                    aria-pressed={selected === i}
                    onClick={() => {
                      setInteracted(true);
                      setSelected((current) => (current === i ? null : i));
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium backdrop-blur transition-colors",
                      selected === i
                        ? "border-sky-300/60 bg-sky-300/15 text-white"
                        : "border-white/12 bg-white/5 text-white/70 hover:border-white/25 hover:text-white",
                    )}
                  >
                    <span className="font-mono text-[11px] text-white/45">{String(i + 1).padStart(2, "0")}</span>
                    <span className="max-w-[11rem] truncate">{p.title}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setResetToken((t) => t + 1);
                  setSelected(null);
                }}
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-white/75 backdrop-blur hover:border-white/25 hover:text-white"
              >
                <RotateCcw className="size-3.5" aria-hidden /> Reset view
              </button>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden className="h-48 bg-[linear-gradient(to_bottom,#070b16_0%,#26324f_38%,#dfe5f2_82%,var(--color-paper)_100%)]" />
    </section>
  );
}
