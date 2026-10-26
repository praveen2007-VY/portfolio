"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type Variants } from "framer-motion";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const heroItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
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
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "span";
}) {
  const Component = as === "span" ? motion.span : motion.div;
  return (
    <Component variants={heroItem} className={as === "span" ? `block ${className ?? ""}` : className}>
      {children}
    </Component>
  );
}
