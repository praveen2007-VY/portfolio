"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/components/portfolio/theme-provider";
import { OrbFallback } from "@/components/three/orb-fallback";

const HeroScene = dynamic(() => import("@/components/three/hero-scene"), {
  ssr: false,
  loading: () => <OrbFallback />,
});

type Capability = "pending" | "none" | "low" | "high";

function detectCapability(): Capability {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return "none";
    // Software rasterisers (no GPU acceleration) would make the page sluggish.
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) return "none";
  } catch {
    return "none";
  }
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (narrow || coarse || cores <= 4 || memory <= 4) return "low";
  return "high";
}

type HeroVisualProps = { accent: string; enabled: boolean; reduced: boolean };

export function HeroVisual({ accent, enabled, reduced }: HeroVisualProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [capability, setCapability] = useState<Capability>("pending");
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    // Defer WebGL work until the browser is idle so text renders first.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      setCapability(detectCapability());
      setReady(true);
    });
    return () => cancel(handle as number);
  }, [enabled]);

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "100px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { theme } = useTheme();
  const animate = !(prefersReduced || reduced);
  const show3d = enabled && ready && (capability === "high" || capability === "low");

  return (
    <div ref={wrapper} className="relative aspect-square w-full" data-testid="hero-visual">
      <div
        aria-hidden
        className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.2)_0%,rgba(56,189,248,0.08)_40%,transparent_70%)] blur-3xl opacity-70 dark:opacity-100"
      />
      {show3d ? (
        <HeroScene
          accent={accent}
          quality={capability === "high" ? "high" : "low"}
          animate={animate}
          active={visible}
          theme={theme}
        />
      ) : (
        <OrbFallback animate={animate} />
      )}
    </div>
  );
}
