"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/portfolio/theme-provider";
import { cn } from "@/lib/utils/format";

type ThemeToggleProps = {
  className?: string;
};

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const isDark = mounted ? theme === "dark" : false;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative grid size-10 place-items-center rounded-xl transition-all duration-300",
        "text-ink-2 hover:bg-mist hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
    >
      <span className="relative size-5">
        {/* Sun — visible in light mode */}
        <Sun
          className={cn(
            "absolute inset-0 size-5 transition-all duration-300",
            isDark ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
          )}
          aria-hidden
        />
        {/* Moon — visible in dark mode */}
        <Moon
          className={cn(
            "absolute inset-0 size-5 transition-all duration-300",
            isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0",
          )}
          aria-hidden
        />
      </span>
    </button>
  );
}
