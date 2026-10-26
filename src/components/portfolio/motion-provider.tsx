"use client";

import { MotionConfig } from "framer-motion";

/** 'user' follows prefers-reduced-motion; the site setting can force reduced motion. */
export function MotionProvider({ reduced, children }: { reduced: boolean; children: React.ReactNode }) {
  return <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>;
}
