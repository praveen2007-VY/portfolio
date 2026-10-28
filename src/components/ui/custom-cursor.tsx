"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useTheme } from "@/components/portfolio/theme-provider";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};

type TrailNode = {
  x: number;
  y: number;
  curlPhase: number;
};

function subscribePointerFine(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getPointerFineSnapshot(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;
}

function getServerPointerFineSnapshot(): boolean {
  return false;
}

function isTextInput(target: HTMLElement | null): boolean {
  if (!target) return false;
  if (
    target.closest(
      'input, textarea, select, [contenteditable="true"], [data-cursor="text"]'
    )
  ) {
    return true;
  }
  const selection = typeof window !== "undefined" ? window.getSelection() : null;
  return Boolean(selection && selection.toString().trim().length > 0);
}

function isInteractive(target: HTMLElement | null): boolean {
  if (!target) return false;

  // 3D Canvas dataset cursor
  if (target instanceof HTMLCanvasElement && target.dataset.cursor === "card") {
    return true;
  }

  return Boolean(
    target.closest(
      'a, button, [role="button"], [role="link"], [data-cursor="chip"], [data-cursor="card"], [data-project-card], article, summary, [role="group"][aria-label="Projects"] button'
    )
  );
}

export function CustomCursor() {
  const { theme } = useTheme();
  const hasFinePointer = useSyncExternalStore(
    subscribePointerFine,
    getPointerFineSnapshot,
    getServerPointerFineSnapshot,
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === "dark";

  // Coordinates and state refs for zero-re-render rAF loop
  const mouseRef = useRef({ x: -100, y: -100, visible: false, isText: false, isHovered: false });
  const trailRef = useRef<TrailNode[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const opacityRef = useRef(0);
  const hoverFactorRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    if (!hasFinePointer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;
    const onMotionQueryChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    motionQuery.addEventListener("change", onMotionQueryChange);

    document.documentElement.classList.add("has-custom-cursor");

    // 5 lightweight fading trail particles for a natural, curved comet-like tail
    const trailCount = 5;
    trailRef.current = Array.from({ length: trailCount }, (_, i) => ({
      x: -100,
      y: -100,
      curlPhase: i * 0.8,
    }));

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationId: number;

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
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;

      const target = e.target as HTMLElement | null;
      const isText = isTextInput(target);
      const isHovered = isInteractive(target);

      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.isText = isText;
      m.isHovered = isHovered;

      if (!m.visible) {
        m.visible = true;
        // Snap trail nodes to entry position to avoid initial jump
        for (const node of trailRef.current) {
          node.x = e.clientX;
          node.y = e.clientY;
        }
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      if (mouseRef.current.isText) return;

      // Brief, tiny particle sparkle on click (NO expanding circles or rings)
      if (!reducedMotionRef.current) {
        const sparkCount = 7;
        const coreColor = isDark ? "#60A5FA" : "#2563EB";
        const highlightColor = isDark ? "#22D3EE" : "#60A5FA";

        for (let i = 0; i < sparkCount; i++) {
          const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.6;
          const speed = 2.0 + Math.random() * 2.2;
          sparksRef.current.push({
            x: e.clientX,
            y: e.clientY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 15 + Math.floor(Math.random() * 5),
            size: 1.4 + Math.random() * 1.2,
            color: i % 2 === 0 ? coreColor : highlightColor,
          });
        }
      }
    };

    const onMouseLeave = () => {
      mouseRef.current.visible = false;
    };

    const onMouseEnter = (e: MouseEvent) => {
      mouseRef.current.visible = true;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      for (const node of trailRef.current) {
        node.x = e.clientX;
        node.y = e.clientY;
      }
    };

    const onWindowBlur = () => {
      mouseRef.current.visible = false;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave, { passive: true });
    document.documentElement.addEventListener("mouseenter", onMouseEnter, { passive: true });
    window.addEventListener("blur", onWindowBlur);

    let frame = 0;

    // Frame animation loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      frame++;

      const m = mouseRef.current;
      const targetOpacity = m.visible && !m.isText ? 1 : 0;
      opacityRef.current += (targetOpacity - opacityRef.current) * 0.22;

      const targetHover = m.isHovered ? 1 : 0;
      hoverFactorRef.current += (targetHover - hoverFactorRef.current) * 0.16;

      const opacity = opacityRef.current;
      const hover = hoverFactorRef.current;

      if (opacity > 0.005) {
        const headX = m.x;
        const headY = m.y;
        const trail = trailRef.current;

        // The central point follows immediately.
        // The trailing particles follow smoothly with natural easing and subtle curve.
        if (!reducedMotionRef.current && trail.length > 0) {
          let prevX = headX;
          let prevY = headY;

          for (let i = 0; i < trail.length; i++) {
            const node = trail[i];
            const ease = 0.38 - i * 0.04; // natural easing along trail
            node.x += (prevX - node.x) * ease;
            node.y += (prevY - node.y) * ease;

            prevX = node.x;
            prevY = node.y;
          }

          // Draw the smooth connected comet tail spine
          ctx.beginPath();
          ctx.moveTo(headX, headY);
          for (let i = 0; i < trail.length - 1; i++) {
            const xc = (trail[i].x + trail[i + 1].x) / 2;
            const yc = (trail[i].y + trail[i + 1].y) / 2;
            ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
          }
          if (trail.length > 1) {
            ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
          }

          const tailGradient = ctx.createLinearGradient(
            headX,
            headY,
            trail[trail.length - 1].x,
            trail[trail.length - 1].y,
          );

          if (isDark) {
            tailGradient.addColorStop(0, `rgba(96, 165, 250, ${(0.65 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(0.5, `rgba(34, 211, 238, ${(0.35 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(1, "rgba(34, 211, 238, 0)");
          } else {
            tailGradient.addColorStop(0, `rgba(37, 99, 235, ${(0.55 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(0.5, `rgba(96, 165, 250, ${(0.28 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(1, "rgba(96, 165, 250, 0)");
          }

          ctx.strokeStyle = tailGradient;
          ctx.lineWidth = 3.6 + hover * 1.2;
          ctx.lineCap = "round";
          ctx.stroke();

          // Draw the 4-6 lightweight fading trail particles with varied opacity and size
          const particleSizes = [3.8, 3.0, 2.3, 1.6, 1.0];
          const particleAlphas = [0.55, 0.42, 0.30, 0.18, 0.08];

          for (let i = 0; i < trail.length; i++) {
            const node = trail[i];
            const size = (particleSizes[i] ?? 1.0) * (1 + hover * 0.25);
            const alpha = (particleAlphas[i] ?? 0.1) * opacity * (1 + hover * 0.3);

            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, Math.PI * 2);

            if (isDark) {
              ctx.fillStyle = i % 2 === 0
                ? `rgba(96, 165, 250, ${alpha.toFixed(3)})`
                : `rgba(34, 211, 238, ${alpha.toFixed(3)})`;
            } else {
              ctx.fillStyle = i % 2 === 0
                ? `rgba(37, 99, 235, ${alpha.toFixed(3)})`
                : `rgba(96, 165, 250, ${alpha.toFixed(3)})`;
            }
            ctx.fill();
          }
        }

        // ─── WIDE, SOFT RADIAL GLOW (40–55px across, ~20–27px radius) ────────
        // Blends naturally into the white background with no harsh borders or rings.
        const glowRadius = isDark ? 23 + hover * 5 : 21 + hover * 5; // 42px to 56px across
        const glowAlpha = isDark ? (0.42 + hover * 0.2) * opacity : (0.24 + hover * 0.14) * opacity;

        const radialGlow = ctx.createRadialGradient(headX, headY, 0, headX, headY, glowRadius);
        if (isDark) {
          radialGlow.addColorStop(0, `rgba(96, 165, 250, ${glowAlpha.toFixed(3)})`);
          radialGlow.addColorStop(0.35, `rgba(34, 211, 238, ${(glowAlpha * 0.6).toFixed(3)})`);
          radialGlow.addColorStop(0.7, `rgba(34, 211, 238, ${(glowAlpha * 0.18).toFixed(3)})`);
          radialGlow.addColorStop(1, "rgba(34, 211, 238, 0)");
        } else {
          radialGlow.addColorStop(0, `rgba(37, 99, 235, ${glowAlpha.toFixed(3)})`);
          radialGlow.addColorStop(0.35, `rgba(96, 165, 250, ${(glowAlpha * 0.55).toFixed(3)})`);
          radialGlow.addColorStop(0.7, `rgba(96, 165, 250, ${(glowAlpha * 0.16).toFixed(3)})`);
          radialGlow.addColorStop(1, "rgba(96, 165, 250, 0)");
        }

        ctx.beginPath();
        ctx.arc(headX, headY, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = radialGlow;
        ctx.fill();

        // ─── CENTRAL GLOWING DOT (8–10px diameter: radius 4.4px – 5.0px) ─────
        // ABSOLUTELY NO circles, rings, crosshairs, borders, or target shapes.
        const pulse = Math.sin(frame * 0.08) * 0.3;
        const dotRadius = isDark ? 4.6 + hover * 0.6 + pulse : 4.4 + hover * 0.5 + pulse;

        // Core base (solid cobalt blue)
        ctx.beginPath();
        ctx.arc(headX, headY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(96, 165, 250, ${(0.96 * opacity).toFixed(3)})`
          : `rgba(37, 99, 235, ${(0.95 * opacity).toFixed(3)})`;
        ctx.fill();

        // Subtle lighter-blue highlight overlay inside the core
        const highlightRadius = dotRadius * 0.62;
        ctx.beginPath();
        ctx.arc(headX, headY, highlightRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(34, 211, 238, ${(0.98 * opacity).toFixed(3)})`
          : `rgba(96, 165, 250, ${(0.94 * opacity).toFixed(3)})`;
        ctx.fill();

        // Pinpoint bright specular spark at center
        const pinRadius = dotRadius * 0.32;
        ctx.beginPath();
        ctx.arc(headX, headY, pinRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(255, 255, 255, ${(0.95 * opacity).toFixed(3)})`
          : `rgba(224, 242, 254, ${(0.92 * opacity).toFixed(3)})`;
        ctx.fill();
      }

      // Update and draw click sparkle particles (NO expanding circles or rings)
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.93;
        s.vy *= 0.93;
        s.life -= 1 / s.maxLife;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const sparkAlpha = Math.max(0, s.life) * (isDark ? 0.95 : 0.85);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);

        if (isDark) {
          ctx.fillStyle = s.color === "#60A5FA"
            ? `rgba(96, 165, 250, ${sparkAlpha.toFixed(3)})`
            : `rgba(34, 211, 238, ${sparkAlpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = s.color === "#2563EB"
            ? `rgba(37, 99, 235, ${sparkAlpha.toFixed(3)})`
            : `rgba(96, 165, 250, ${sparkAlpha.toFixed(3)})`;
        }
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      motionQuery.removeEventListener("change", onMotionQueryChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.documentElement.removeEventListener("mouseenter", onMouseEnter);
      window.removeEventListener("blur", onWindowBlur);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [hasFinePointer, isDark]);

  if (!hasFinePointer) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[99999] select-none"
    />
  );
}
