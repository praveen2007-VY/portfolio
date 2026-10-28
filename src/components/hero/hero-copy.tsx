"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

export const heroItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export const heroBadgeItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

export const heroGreetingItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export const heroHeadlineItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] } },
};

export const heroDescriptionItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export const heroActionsItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } },
};

/** Staggered entrance plus a gentle parallax drift as the hero scrolls away. */
export function HeroCopy({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.2]);

  return (
    <motion.div ref={ref} style={{ y, opacity }} className="relative z-10">
      <motion.div variants={container} initial="hidden" animate="show">
        {children}
      </motion.div>
    </motion.div>
  );
}

export function HeroItem({
  children,
  className,
  as = "div",
  variant = heroItem,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "span";
  variant?: Variants;
}) {
  const Component = as === "span" ? motion.span : motion.div;
  return (
    <Component variants={variant} className={as === "span" ? `block ${className ?? ""}` : className}>
      {children}
    </Component>
  );
}

/** Smooth entrance container for the 3D Orb visual (Step 6 of hero sequence). */
export function HeroOrbContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.45, duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-[min(560px,88vw)] lg:max-w-none"
    >
      {children}
    </motion.div>
  );
}

/** Smooth gradual fade-in for background atmospheric elements (Step 7 of hero sequence). */
export function HeroBackgroundElements() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: 1.3, ease: "easeOut" }}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
    >
      <div className="hairline-grid absolute inset-0 [mask-image:radial-gradient(ellipse_75%_65%_at_60%_35%,black_20%,transparent_75%)]" />
      <div className="absolute top-[-20%] right-[-10%] size-[620px] rounded-full bg-[radial-gradient(circle,rgb(var(--accent-rgb)/0.13),transparent_62%)] blur-2xl" />
      <div className="absolute bottom-0 left-[-12%] size-[420px] rounded-full bg-[radial-gradient(circle,rgb(90_162_255/0.12),transparent_65%)] blur-2xl" />
    </motion.div>
  );
}

/** Smooth entrance container for the stats bar under the hero section. */
export function HeroStatsContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.85, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-y border-line/80 bg-paper/60 backdrop-blur dark:bg-paper/80"
    >
      {children}
    </motion.div>
  );
}
