"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import {
  isCountableClick,
  registerSecretClick,
  SECRET_CLICK_COUNT,
  SECRET_CLICK_WINDOW_MS,
} from "@/lib/utils/secret-clicks";

type LogoMarkProps = { initials: string; name: string };

/**
 * Site logo. A normal click scrolls to the top. Five quick pointer clicks
 * (within ~3 s) open /admin/login. This is discovery only: the admin area is
 * protected by Supabase Auth and server-side checks, not by this interaction.
 */
export function LogoMark({ initials, name }: LogoMarkProps) {
  const router = useRouter();
  const history = useRef<number[]>([]);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState(0);
  const controls = useAnimationControls();
  const link = useRef<HTMLAnchorElement>(null);

  // Marks the logo as interactive once hydrated (used by end-to-end tests).
  useEffect(() => link.current?.setAttribute("data-ready", "true"), []);

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isCountableClick(event)) return;
    // Scroll to the top ourselves instead of following the hash link: repeated
    // native hash navigations fire popstate events that could race with the
    // router.push below.
    event.preventDefault();
    // Use the input's own timestamp, not the handler's run time, so a busy main
    // thread can neither stretch fast clicks apart nor bunch slow ones together.
    const result = registerSecretClick(history.current, event.timeStamp);
    history.current = result.history;
    controls.start({ scale: [1, 0.9, 1], transition: { duration: 0.28 } });

    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (result.triggered) {
      setProgress(0);
      router.push("/admin/login");
      return;
    }
    document.getElementById("top")?.scrollIntoView();
    if (window.location.hash !== "#top") window.history.replaceState(window.history.state, "", "#top");
    setProgress(result.history.length);
    resetTimer.current = setTimeout(() => {
      history.current = [];
      setProgress(0);
    }, SECRET_CLICK_WINDOW_MS);
  }

  const showRing = progress >= 2;
  const circumference = 2 * Math.PI * 19;

  return (
    <a
      ref={link}
      href="#top"
      onClick={onClick}
      className="group flex items-center gap-2.5 rounded-xl"
      aria-label={`${name} — back to top`}
    >
      <motion.span animate={controls} className="relative grid size-9 place-items-center">
        <span className="absolute inset-0 rounded-[10px] bg-[#0a0d14] shadow-[0_6px_16px_-6px_rgb(10_13_20/0.5)] transition-all duration-300 group-hover:rotate-6 dark:border dark:border-sky-400/25 dark:bg-[#111827] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.5),0_0_12px_-2px_rgba(37,99,235,0.3)]" />
        <span className="absolute inset-[3px] rounded-[7px] bg-[linear-gradient(140deg,rgb(255_255_255/0.18),transparent_55%)] dark:bg-[linear-gradient(140deg,rgba(56,189,248,0.2),transparent_55%)]" />
        <span className="relative font-mono text-[12.5px] font-semibold tracking-tight text-white">
          {initials}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 44 44"
          className="pointer-events-none absolute -inset-1 size-11 -rotate-90 transition-opacity duration-300"
          style={{ opacity: showRing ? 1 : 0 }}
        >
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / SECRET_CLICK_COUNT)}
            style={{ transition: "stroke-dashoffset 200ms ease-out" }}
          />
        </svg>
      </motion.span>
      <span className="hidden text-[15px] font-semibold tracking-tight text-ink sm:inline">{name}</span>
    </a>
  );
}
