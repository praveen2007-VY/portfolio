"use client";

import { motion } from "framer-motion";

/** Unmasks its content from the centre the first time it scrolls into view. */
export function ImageReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ clipPath: "inset(8% 8% 8% 8% round 18px)", scale: 1.06 }}
      whileInView={{ clipPath: "inset(0% 0% 0% 0% round 0px)", scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
