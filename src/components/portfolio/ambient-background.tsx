"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/portfolio/theme-provider";

type AmbientParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  phaseSpeed: number;
  pulsePhase: number;
  pulseSpeed: number;
  colorType: "cobalt" | "cyan" | "silver";
};

export function AmbientBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReduced = reducedQuery.matches;
    const onReducedChange = (e: MediaQueryListEvent) => {
      isReduced = e.matches;
    };
    reducedQuery.addEventListener("change", onReducedChange);

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationId: number;

    const particles: AmbientParticle[] = [];
    const count = 28;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Re-distribute particles if needed
      if (particles.length === 0) {
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.18,
            vy: -0.12 - Math.random() * 0.22, // gentle upward drift
            radius: 1.2 + Math.random() * 2.0,
            baseAlpha: 0.2 + Math.random() * 0.35,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: 0.008 + Math.random() * 0.015,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.01 + Math.random() * 0.02,
            colorType: i % 3 === 0 ? "cobalt" : i % 3 === 1 ? "cyan" : "silver",
          });
        }
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    let isVisible = document.visibilityState === "visible";
    const onVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
      if (isVisible) {
        animationId = requestAnimationFrame(render);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const render = () => {
      if (!isVisible) return;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle ambient light gradients in the background (light mode only)
      if (!isDark) {
        // Light mode: pure white canvas with whisper-soft cobalt ambience
        const glowTop = ctx.createRadialGradient(width * 0.8, height * 0.2, 0, width * 0.8, height * 0.2, width * 0.5);
        glowTop.addColorStop(0, "rgba(36, 87, 245, 0.025)");
        glowTop.addColorStop(1, "rgba(36, 87, 245, 0)");
        ctx.fillStyle = glowTop;
        ctx.fillRect(0, 0, width, height);

        const glowBottom = ctx.createRadialGradient(width * 0.2, height * 0.8, 0, width * 0.2, height * 0.8, width * 0.45);
        glowBottom.addColorStop(0, "rgba(90, 162, 255, 0.02)");
        glowBottom.addColorStop(1, "rgba(90, 162, 255, 0)");
        ctx.fillStyle = glowBottom;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw each floating particle
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!isReduced) {
          p.x += p.vx + Math.sin(p.phase) * 0.15;
          p.y += p.vy;
          p.phase += p.phaseSpeed;
          p.pulsePhase += p.pulseSpeed;

          // Wrap boundaries
          if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          }
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
        }

        const alphaMod = isReduced ? p.baseAlpha : p.baseAlpha * (0.8 + 0.3 * Math.sin(p.pulsePhase));
        const r = isReduced ? p.radius : p.radius * (0.9 + 0.2 * Math.sin(p.pulsePhase));

        const color = isDark
          ? p.colorType === "cobalt"
            ? `rgba(56, 189, 248, ${alphaMod.toFixed(3)})`
            : p.colorType === "cyan"
              ? `rgba(125, 211, 252, ${(alphaMod * 1.1).toFixed(3)})`
              : `rgba(186, 230, 253, ${(alphaMod * 0.7).toFixed(3)})`
          : p.colorType === "cobalt"
            ? `rgba(36, 87, 245, ${(alphaMod * 0.75).toFixed(3)})`
            : p.colorType === "cyan"
              ? `rgba(79, 140, 255, ${(alphaMod * 0.7).toFixed(3)})`
              : `rgba(160, 175, 215, ${(alphaMod * 0.6).toFixed(3)})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Soft outer glow for select particles
        if (p.radius > 2.2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = isDark
            ? `rgba(56, 189, 248, ${(alphaMod * 0.18).toFixed(3)})`
            : `rgba(36, 87, 245, ${(alphaMod * 0.12).toFixed(3)})`;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedQuery.removeEventListener("change", onReducedChange);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 size-full select-none"
    />
  );
}
