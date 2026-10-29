"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
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

/**
 * Returns true if the element is an editable text field (used for precision cursor mode).
 * Never checks window.getSelection() so text selection or multiple clicks NEVER hide the cursor.
 */
export function isTextInput(target: HTMLElement | null): boolean {
  if (!target) return false;
  return Boolean(
    target.closest?.(
      'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]), textarea, [contenteditable="true"], [data-cursor="text"]'
    )
  );
}

/**
 * Detects if the hovered element is interactive (button, link, tab, card, chip, tags, etc.)
 */
export function isInteractive(target: HTMLElement | null): boolean {
  if (!target) return false;

  if (
    (target.tagName === "CANVAS" ||
      (typeof HTMLCanvasElement !== "undefined" && target instanceof HTMLCanvasElement)) &&
    (target.dataset?.cursor === "card" || target.dataset?.cursor === "grab")
  ) {
    return true;
  }

  return Boolean(
    target.closest?.(
      'a, button, [role="button"], [role="link"], [data-cursor="chip"], [data-cursor="card"], [data-project-card], article, summary, [role="group"][aria-label="Projects"] button, label, select, input[type="checkbox"], input[type="radio"], [tabindex]:not([tabindex="-1"])'
    )
  );
}

export function CustomCursor() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const hasFinePointer = useSyncExternalStore(
    subscribePointerFine,
    getPointerFineSnapshot,
    getServerPointerFineSnapshot,
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = theme === "dark";
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  // Zero-re-render mutable state refs for 60/120fps rAF loop
  const mouseRef = useRef({
    x: -100,
    y: -100,
    visible: false,
    isText: false,
    isHovered: false,
    isDown: false,
  });
  const trailRef = useRef<TrailNode[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const opacityRef = useRef(0);
  const hoverFactorRef = useRef(0);
  const textFactorRef = useRef(0);
  const clickFactorRef = useRef(0);
  const reducedMotionRef = useRef(false);

  // Helper to promote the canvas to the browser's top layer (above modals/dialogs/backdrops)
  const promoteToTopLayer = () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.showPopover !== "function") return;
    try {
      if (canvas.matches(":popover-open")) {
        canvas.hidePopover();
      }
      canvas.showPopover();
    } catch {
      // Graceful fallback for non-popover environments
    }
  };

  // Re-promote whenever route changes or fine pointer status updates
  useEffect(() => {
    if (!hasFinePointer) return;
    document.documentElement.classList.add("has-custom-cursor");
    promoteToTopLayer();
  }, [pathname, hasFinePointer]);

  useEffect(() => {
    if (!hasFinePointer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Enable popover top-layer positioning if supported by the browser
    if (typeof canvas.showPopover === "function") {
      canvas.setAttribute("popover", "manual");
      promoteToTopLayer();
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;
    const onMotionQueryChange = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    motionQuery.addEventListener("change", onMotionQueryChange);

    document.documentElement.classList.add("has-custom-cursor");

    // 5 trailing nodes for smooth, curved comet tail
    const trailCount = 5;
    trailRef.current = Array.from({ length: trailCount }, () => ({
      x: mouseRef.current.x > 0 ? mouseRef.current.x : -100,
      y: mouseRef.current.y > 0 ? mouseRef.current.y : -100,
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

    // MutationObserver to watch for <dialog> open/close or top-layer modals
    const dialogObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "open") {
          promoteToTopLayer();
          break;
        }
      }
    });
    dialogObserver.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["open"],
    });

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
        for (const node of trailRef.current) {
          node.x = e.clientX;
          node.y = e.clientY;
        }
      }
    };

    const spawnSparkles = (x: number, y: number) => {
      if (reducedMotionRef.current) return;
      const sparkCount = 7;
      const isD = isDarkRef.current;
      const coreColor = isD ? "#60A5FA" : "#2563EB";
      const highlightColor = isD ? "#22D3EE" : "#38BDF8";

      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.6;
        const speed = 1.8 + Math.random() * 2.2;
        sparksRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 14 + Math.floor(Math.random() * 5),
          size: 1.4 + Math.random() * 1.2,
          color: i % 2 === 0 ? coreColor : highlightColor,
        });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;

      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.visible = true;
      m.isDown = true;

      spawnSparkles(e.clientX, e.clientY);

      // If a modal dialog was opened during click, ensure top layer
      if (document.querySelector("dialog[open]")) {
        promoteToTopLayer();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const m = mouseRef.current;
      m.x = e.clientX;
      m.y = e.clientY;
      m.visible = true;
      m.isDown = false;
    };

    const onPointerCancel = () => {
      mouseRef.current.isDown = false;
    };

    const onMouseLeave = (e: MouseEvent) => {
      // Only set invisible if the cursor genuinely left the viewport boundary
      if (
        e.clientY <= 0 ||
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight ||
        (!e.relatedTarget && !(e as unknown as { toElement?: unknown }).toElement)
      ) {
        mouseRef.current.visible = false;
      }
    };

    const onMouseEnter = (e: MouseEvent) => {
      const m = mouseRef.current;
      m.visible = true;
      m.x = e.clientX;
      m.y = e.clientY;
      for (const node of trailRef.current) {
        node.x = e.clientX;
        node.y = e.clientY;
      }
    };

    const onWindowFocus = () => {
      mouseRef.current.visible = true;
      promoteToTopLayer();
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        mouseRef.current.visible = true;
        promoteToTopLayer();
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerCancel, { passive: true });
    document.documentElement.addEventListener("mouseleave", onMouseLeave, { passive: true });
    document.documentElement.addEventListener("mouseenter", onMouseEnter, { passive: true });
    window.addEventListener("focus", onWindowFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    let frame = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      frame++;

      const isD = isDarkRef.current;
      const m = mouseRef.current;

      // Always visible while in window, never hidden over inputs
      const targetOpacity = m.visible ? 1 : 0;
      opacityRef.current += (targetOpacity - opacityRef.current) * 0.22;

      const targetHover = m.isHovered ? 1 : 0;
      hoverFactorRef.current += (targetHover - hoverFactorRef.current) * 0.18;

      const targetText = m.isText ? 1 : 0;
      textFactorRef.current += (targetText - textFactorRef.current) * 0.2;

      const targetClick = m.isDown ? 1 : 0;
      clickFactorRef.current += (targetClick - clickFactorRef.current) * 0.25;

      const opacity = opacityRef.current;
      const hover = hoverFactorRef.current;
      const text = textFactorRef.current;
      const click = clickFactorRef.current;

      if (opacity > 0.005) {
        const headX = m.x;
        const headY = m.y;
        const trail = trailRef.current;

        // Smooth trailing comet spine (disabled under prefers-reduced-motion)
        if (!reducedMotionRef.current && trail.length > 0) {
          let prevX = headX;
          let prevY = headY;

          for (let i = 0; i < trail.length; i++) {
            const node = trail[i];
            const ease = 0.38 - i * 0.04;
            node.x += (prevX - node.x) * ease;
            node.y += (prevY - node.y) * ease;
            prevX = node.x;
            prevY = node.y;
          }

          // Spine line
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

          if (isD) {
            tailGradient.addColorStop(0, `rgba(96, 165, 250, ${(0.65 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(0.5, `rgba(34, 211, 238, ${(0.35 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(1, "rgba(34, 211, 238, 0)");
          } else {
            tailGradient.addColorStop(0, `rgba(37, 99, 235, ${(0.55 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(0.5, `rgba(56, 189, 248, ${(0.28 * opacity).toFixed(3)})`);
            tailGradient.addColorStop(1, "rgba(56, 189, 248, 0)");
          }

          ctx.strokeStyle = tailGradient;
          ctx.lineWidth = 3.6 + hover * 1.2 - text * 1.0;
          ctx.lineCap = "round";
          ctx.stroke();

          // Fading trail particles along comet tail
          const particleSizes = [3.8, 3.0, 2.3, 1.6, 1.0];
          const particleAlphas = [0.55, 0.42, 0.30, 0.18, 0.08];

          for (let i = 0; i < trail.length; i++) {
            const node = trail[i];
            const size = (particleSizes[i] ?? 1.0) * (1 + hover * 0.25 - text * 0.2);
            const alpha = (particleAlphas[i] ?? 0.1) * opacity * (1 + hover * 0.3);

            ctx.beginPath();
            ctx.arc(node.x, node.y, Math.max(0.6, size), 0, Math.PI * 2);

            if (isD) {
              ctx.fillStyle = i % 2 === 0
                ? `rgba(96, 165, 250, ${alpha.toFixed(3)})`
                : `rgba(34, 211, 238, ${alpha.toFixed(3)})`;
            } else {
              ctx.fillStyle = i % 2 === 0
                ? `rgba(29, 78, 216, ${alpha.toFixed(3)})`
                : `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
            }
            ctx.fill();
          }
        }

        // ─── SOFT CYAN-BLUE RADIAL OUTER GLOW (no hard rings or circles) ─────
        const glowRadius = isD
          ? 24 + hover * 6 - text * 6
          : 22 + hover * 5 - text * 5;
        const glowAlpha = isD
          ? (0.42 + hover * 0.2) * opacity
          : (0.28 + hover * 0.16) * opacity;

        const radialGlow = ctx.createRadialGradient(headX, headY, 0, headX, headY, Math.max(1, glowRadius));
        if (isD) {
          radialGlow.addColorStop(0, `rgba(96, 165, 250, ${glowAlpha.toFixed(3)})`);
          radialGlow.addColorStop(0.35, `rgba(34, 211, 238, ${(glowAlpha * 0.6).toFixed(3)})`);
          radialGlow.addColorStop(0.7, `rgba(34, 211, 238, ${(glowAlpha * 0.18).toFixed(3)})`);
          radialGlow.addColorStop(1, "rgba(34, 211, 238, 0)");
        } else {
          radialGlow.addColorStop(0, `rgba(37, 99, 235, ${glowAlpha.toFixed(3)})`);
          radialGlow.addColorStop(0.35, `rgba(56, 189, 248, ${(glowAlpha * 0.55).toFixed(3)})`);
          radialGlow.addColorStop(0.7, `rgba(56, 189, 248, ${(glowAlpha * 0.16).toFixed(3)})`);
          radialGlow.addColorStop(1, "rgba(56, 189, 248, 0)");
        }

        ctx.beginPath();
        ctx.arc(headX, headY, Math.max(1, glowRadius), 0, Math.PI * 2);
        ctx.fillStyle = radialGlow;
        ctx.fill();

        // ─── CENTRAL GLOWING BLUE DOT (clearly visible, slightly larger) ────
        // Radius ~5.5px base (+1.3px hover, -1.2px text precision, -0.8px click)
        const pulse = Math.sin(frame * 0.07) * 0.25;
        const dotRadius = Math.max(
          3.8,
          5.5 + hover * 1.3 - text * 1.2 - click * 0.8 + pulse,
        );

        // Light mode contrast shadow behind core dot (crisp visibility on white backgrounds)
        if (!isD) {
          ctx.beginPath();
          ctx.arc(headX, headY, dotRadius + 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(15, 23, 42, ${(0.18 * opacity).toFixed(3)})`;
          ctx.fill();
        }

        // Core base (solid cobalt blue)
        ctx.beginPath();
        ctx.arc(headX, headY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = isD
          ? `rgba(59, 130, 246, ${(0.96 * opacity).toFixed(3)})`
          : `rgba(29, 78, 216, ${(0.98 * opacity).toFixed(3)})`;
        ctx.fill();

        // Bright cyan-blue highlight overlay inside core
        const highlightRadius = dotRadius * 0.62;
        ctx.beginPath();
        ctx.arc(headX, headY, highlightRadius, 0, Math.PI * 2);
        ctx.fillStyle = isD
          ? `rgba(34, 211, 238, ${(0.98 * opacity).toFixed(3)})`
          : `rgba(56, 189, 248, ${(0.95 * opacity).toFixed(3)})`;
        ctx.fill();

        // Pinpoint specular white spark at center
        const pinRadius = dotRadius * 0.3;
        ctx.beginPath();
        ctx.arc(headX, headY, pinRadius, 0, Math.PI * 2);
        ctx.fillStyle = isD
          ? `rgba(255, 255, 255, ${(0.96 * opacity).toFixed(3)})`
          : `rgba(255, 255, 255, ${(0.95 * opacity).toFixed(3)})`;
        ctx.fill();
      }

      // Update and draw click sparkle particles
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vx *= 0.92;
        s.vy *= 0.92;
        s.life -= 1 / s.maxLife;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const sparkAlpha = Math.max(0, s.life) * (isD ? 0.95 : 0.88);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);

        if (isD) {
          ctx.fillStyle = s.color === "#60A5FA"
            ? `rgba(96, 165, 250, ${sparkAlpha.toFixed(3)})`
            : `rgba(34, 211, 238, ${sparkAlpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = s.color === "#2563EB"
            ? `rgba(29, 78, 216, ${sparkAlpha.toFixed(3)})`
            : `rgba(56, 189, 248, ${sparkAlpha.toFixed(3)})`;
        }
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      dialogObserver.disconnect();
      motionQuery.removeEventListener("change", onMotionQueryChange);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.documentElement.removeEventListener("mouseleave", onMouseLeave);
      document.documentElement.removeEventListener("mouseenter", onMouseEnter);
      window.removeEventListener("focus", onWindowFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.documentElement.classList.remove("has-custom-cursor");
      if (typeof canvas.hidePopover === "function") {
        try {
          if (canvas.matches(":popover-open")) canvas.hidePopover();
        } catch {
          // ignore
        }
      }
    };
  }, [hasFinePointer]);

  if (!hasFinePointer) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="custom-cursor-canvas pointer-events-none fixed inset-0 z-[2147483647] select-none"
    />
  );
}
