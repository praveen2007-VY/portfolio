"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { Hand, MousePointerClick, RotateCcw, ScrollText } from "lucide-react";
import { DetailsPanel } from "@/components/showcase/gallery/details-panel";
import type { GalleryCard } from "@/components/showcase/gallery/gallery-scene";
import { StudioBackdrop } from "@/components/showcase/gallery/studio-backdrop";
import { useTheme } from "@/components/portfolio/theme-provider";
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
  const featuredIndex = Math.max(0, projects.findIndex((p) => p.is_featured));
  const [activeProject, setActiveProject] = useState<number>(featuredIndex);
  const [selected, setSelected] = useState<number | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const reduced = useReducedMotion();
  const n = projects.length;

  // Access the current theme so we can style the scene and UI elements appropriately.
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.4, restDelta: 0.0005 });
  const headerOpacity = useTransform(progress, [0.85, 1], [1, 0]);

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

  const select = useCallback((index: number | null) => {
    if (index !== null) {
      setActiveProject(index);
      setSelected(index);
    } else {
      setSelected(null);
    }
  }, []);

  const markInteracted = useCallback(() => setInteracted(true), []);

  // Closing returns focus to the project's button in the index without shifting the center card.
  const close = useCallback(() => {
    if (selected !== null) {
      const button = railButtons.current[selected];
      requestAnimationFrame(() => button?.focus({ preventScroll: true }));
    }
    setSelected(null);
  }, [selected]);

  const step = useCallback(
    (delta: number) => {
      setActiveProject((current) => {
        const next = (current + delta + n) % n;
        setSelected(next);
        return next;
      });
    },
    [n],
  );

  const resetView = useCallback(() => {
    setResetToken((t) => t + 1);
    setActiveProject(featuredIndex);
    setSelected(null);
  }, [featuredIndex]);

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

  // ── Theme-aware colours ────────────────────────────────────────────────────
  // Light mode: seamless pure white matching the existing Hero and Skills sections.
  // Dark mode: the existing immersive dark navy.
  const eyebrowClass = isDark ? "text-sky-300" : "text-accent";
  const eyebrowLine = isDark ? "bg-sky-300/60" : "bg-accent/60";

  // Description text colour
  const descClass = isDark ? "text-white/60" : "text-ink-2/70";

  // Hint list text colour
  const hintClass = isDark ? "text-white/55" : "text-ink/40";

  // Rail button styles
  const railBtnBase = "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium backdrop-blur transition-all duration-200";
  const railBtnActive = isDark
    ? "border-sky-300/60 bg-sky-300/15 text-white"
    : "border-accent/40 bg-accent-soft text-accent-strong shadow-soft";
  const railBtnInactive = isDark
    ? "border-white/12 bg-white/5 text-white/70 hover:border-white/25 hover:text-white"
    : "border-line bg-paper/90 text-ink-2 hover:border-line-strong hover:bg-paper hover:text-ink shadow-soft";
  const resetBtnClass = isDark
    ? "flex shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3.5 py-1.5 text-[12.5px] font-medium text-white/75 backdrop-blur hover:border-white/25 hover:text-white"
    : "flex shrink-0 items-center gap-2 rounded-full border border-line bg-paper/90 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 backdrop-blur hover:border-line-strong hover:bg-paper hover:text-ink shadow-soft";

  return (
    <section
      id="projects"
      aria-labelledby="projects-heading"
      data-showcase-mode="gallery"
      className={cn("relative", isDark ? "bg-[#080d19] text-white" : "bg-paper text-ink")}
    >
      <div ref={track} className="relative" style={{ height: compact ? "200vh" : "260vh" }}>
        <div
          ref={stage}
          className={cn(
            "sticky top-0 h-[100svh] touch-pan-y overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset",
            isDark
              ? "bg-[#080d19] focus-visible:ring-sky-300/60"
              : "bg-paper focus-visible:ring-accent",
          )}
          role="region"
          aria-roledescription="3D project gallery"
          aria-label={`${config.title}. Use the project list or the left and right arrow keys to select a project.`}
          tabIndex={0}
          onKeyDown={onStageKey}
          data-testid="gallery-stage"
        >
          {/* Theme-aware animated particle system and ambient lighting (DOTS ONLY, ZERO LINES) */}
          <StudioBackdrop
            selected={activeProject}
            total={n}
            reduced={Boolean(reduced)}
            compact={compact}
            active={visible}
            isDark={isDark}
          />

          <div className="absolute inset-0" data-testid="gallery-canvas">
            {near && (
              <SceneBoundary onError={onFailure}>
                <GalleryScene
                  cards={cards}
                  featuredIndex={featuredIndex}
                  activeProject={activeProject}
                  progress={progress}
                  selected={selected}
                  onSelect={select}
                  onInteract={markInteracted}
                  resetToken={resetToken}
                  running={visible}
                  compact={compact}
                  animate={!reduced}
                  stateTarget={stage}
                  theme={theme}
                />
              </SceneBoundary>
            )}
          </div>

          {/* Edge vignette in dark mode keeps overlay text legible without dimming the scene centre. Omitted in light mode for pure white clarity. */}
          {isDark && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_50%_45%,transparent_55%,rgb(7_11_22/0.85))]"
            />
          )}

          {/* Heading and hints */}
          <motion.div
            style={{ opacity: headerOpacity }}
            className="pointer-events-none absolute inset-x-0 top-0 pt-24 sm:pt-28"
          >
            <div className="container-page">
              {config.eyebrow && (
                <p className={cn("inline-flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.18em] uppercase", eyebrowClass)}>
                  <span aria-hidden className={cn("h-px w-6", eyebrowLine)} />
                  {config.eyebrow}
                </p>
              )}
              <h2
                id="projects-heading"
                className={cn(
                  "mt-3 max-w-xl text-[clamp(2rem,1.2rem+2.6vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.04em] text-balance",
                  isDark ? "text-white" : "text-ink",
                )}
              >
                {config.title}
              </h2>
              {config.description && !compact && (
                <p className={cn("mt-3 max-w-md text-[15px] leading-relaxed", descClass)}>{config.description}</p>
              )}
              <ul
                className={cn(
                  "mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] transition-opacity duration-700",
                  hintClass,
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
                    theme={theme}
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
                    data-cursor="chip"
                    aria-pressed={activeProject === i}
                    onClick={() => {
                      setInteracted(true);
                      select(i);
                    }}
                    className={cn(railBtnBase, activeProject === i ? railBtnActive : railBtnInactive)}
                  >
                    <span className={cn("font-mono text-[11px]", isDark ? "text-white/45" : "text-ink/35")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="max-w-[11rem] truncate">{p.title}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                data-cursor="button"
                onClick={resetView}
                className={resetBtnClass}
              >
                <RotateCcw className="size-3.5" aria-hidden /> Reset view
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
