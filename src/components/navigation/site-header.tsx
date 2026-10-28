"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Download, Menu, X } from "lucide-react";
import { LogoMark } from "@/components/navigation/logo-mark";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { useActiveSection } from "@/components/navigation/use-active-section";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils/format";

export type NavLink = { id: string; label: string };

type SiteHeaderProps = {
  name: string;
  initials: string;
  links: NavLink[];
  hasResume: boolean;
};

export function SiteHeader({ name, initials, links, hasResume }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(links.map((l) => l.id));
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, mass: 0.3 });
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] origin-left bg-accent"
        style={{ scaleX: progress }}
      />
      <div
        className={cn(
          "transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300",
          scrolled || open
            ? "border-b border-line/80 bg-paper/80 shadow-[0_8px_30px_-20px_rgb(16_24_40/0.25)] backdrop-blur-xl backdrop-saturate-150"
            : "border-b border-transparent",
        )}
      >
        <nav aria-label="Primary" className="container-page flex h-16 items-center justify-between gap-4">
          <LogoMark initials={initials} name={name} />

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const isActive = active === link.id;
              return (
                <li key={link.id} className="relative">
                  <a
                    href={`#${link.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative z-10 block rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                      isActive ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {link.label}
                  </a>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-ink/[0.05] dark:bg-white/[0.08]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-1.5">
            {/* Theme toggle — always visible */}
            <ThemeToggle />

            {hasResume && (
              <a href="/resume" className={buttonClasses("primary", "sm", "hidden h-9 px-3.5 sm:inline-flex")}>
                <Download className="size-3.5" aria-hidden />
                Resume
              </a>
            )}
            <button
              ref={toggleRef}
              type="button"
              className="grid size-10 place-items-center rounded-xl text-ink hover:bg-mist dark:hover:bg-white/10 lg:hidden"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>
          </div>
        </nav>
      </div>

      <div
        id={menuId}
        ref={menuRef}
        hidden={!open}
        className="h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-paper/95 backdrop-blur-xl lg:hidden"
      >
        <ul className="container-page flex flex-col py-4">
          {links.map((link, index) => (
            <li key={link.id}>
              <a
                href={`#${link.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b border-line py-4 text-lg font-medium tracking-tight text-ink"
              >
                {link.label}
                <span className="font-mono text-xs text-subtle">{String(index + 1).padStart(2, "0")}</span>
              </a>
            </li>
          ))}
          {hasResume && (
            <li className="pt-6">
              <a href="/resume" className={buttonClasses("primary", "lg", "w-full")}>
                <Download className="size-4" aria-hidden />
                Download resume
              </a>
            </li>
          )}
        </ul>
      </div>
    </header>
  );
}
