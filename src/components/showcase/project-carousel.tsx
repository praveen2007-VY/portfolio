"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PanelContent } from "@/components/showcase/panel-content";
import { cn } from "@/lib/utils/format";
import type { PublicProject } from "@/types/portfolio";

/** Swipeable cards for small screens, with a light 3D tilt from scroll position. */
export function ProjectCarousel({ projects, basePath, label }: { projects: PublicProject[]; basePath: string; label: string }) {
  const strip = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const n = projects.length;

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const update = () => {
      frame = 0;
      const center = el.scrollLeft + el.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;
      Array.from(el.children).forEach((child, i) => {
        const item = child as HTMLElement;
        const offset = (item.offsetLeft + item.offsetWidth / 2 - center) / item.offsetWidth;
        if (Math.abs(offset) < best) {
          best = Math.abs(offset);
          nearest = i;
        }
        const card = item.firstElementChild as HTMLElement | null;
        if (card && !reduced) {
          const o = Math.max(-1, Math.min(1, offset));
          card.style.transform = `perspective(900px) rotateY(${(-o * 10).toFixed(2)}deg) scale(${(1 - Math.abs(o) * 0.06).toFixed(3)})`;
        }
      });
      setActive(nearest);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  function goTo(i: number) {
    const el = strip.current;
    const item = el?.children[Math.min(n - 1, Math.max(0, i))] as HTMLElement | undefined;
    if (!el || !item) return;
    el.scrollTo({ left: item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2, behavior: "smooth" });
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") goTo(active + 1);
    else if (event.key === "ArrowLeft") goTo(active - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      data-showcase-mode="carousel"
      onKeyDown={onKeyDown}
      className="-mx-4 sm:-mx-6"
    >
      <ul
        ref={strip}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[8vw] pt-2 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {projects.map((project, i) => (
          <li
            key={project.id}
            className="w-[84vw] max-w-[420px] shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${n}`}
          >
            <article className="h-full overflow-hidden rounded-[22px] border border-white/80 bg-white/70 shadow-[0_24px_60px_-30px_rgb(16_24_40/0.35)] backdrop-blur-xl transition-transform duration-150 ease-out will-change-transform">
              <PanelContent project={project} basePath={basePath} layout="stacked" priority={i === 0} />
            </article>
          </li>
        ))}
      </ul>

      {n > 1 && (
        <div className="flex items-center justify-between px-4 sm:px-6">
          <p className="font-mono text-[13px] text-ink tabular-nums" data-testid="showcase-counter">
            {String(active + 1).padStart(2, "0")} <span className="text-subtle">/ {String(n).padStart(2, "0")}</span>
          </p>
          <div role="group" aria-label="Choose a project" className="flex items-center gap-1">
            {projects.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show project ${i + 1}: ${p.title}`}
                aria-current={i === active ? "true" : undefined}
                className="grid size-8 place-items-center rounded-full"
              >
                <span
                  className={cn(
                    "block h-2 rounded-full transition-all duration-300",
                    i === active ? "w-6 bg-accent" : "w-2 bg-ink/20",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Previous project"
              className="grid size-10 place-items-center rounded-full border border-line bg-paper text-ink disabled:opacity-35"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(active + 1)}
              disabled={active === n - 1}
              aria-label="Next project"
              className="grid size-10 place-items-center rounded-full border border-line bg-paper text-ink disabled:opacity-35"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
