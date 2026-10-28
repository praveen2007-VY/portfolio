"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils/format";

type StudioBackdropProps = {
  selected: number | null;
  total: number;
  reduced?: boolean;
  compact?: boolean;
  active?: boolean;
  isDark?: boolean;
  className?: string;
};

type ParticleType = "orbital" | "drift";
type ParticleColor = "silver" | "gray" | "cobalt" | "accent" | "cyan" | "ice" | "deep";

type Particle = {
  type: ParticleType;
  depth: number; // 0.35 (far) to 1.2 (near)
  baseRadius: number;
  currentRadius: number;
  colorType: ParticleColor;
  baseAlpha: number;
  currentAlpha: number;

  // Position
  x: number;
  y: number;

  // Invisible elliptical orbit parameters (used in light mode)
  orbitCx: number;
  orbitCy: number;
  rx: number;
  ry: number;
  tilt: number;
  angle: number;
  speed: number;

  // Drift parameters (multi-directional continuous drift)
  vx: number;
  vy: number;
  driftPhase: number;
  driftFreq: number;

  // Sparkle / reaction
  sparkleTimer: number;
  sparklePeriod: number;
  reactionEnergy: number;
};

function createParticles(
  w: number,
  h: number,
  count: number,
  compact: boolean,
  isDark: boolean,
): Particle[] {
  const particles: Particle[] = [];
  const cx = w * 0.5;
  const cy = h * 0.5;

  for (let i = 0; i < count; i++) {
    // In dark mode: 100% drifting particles moving smoothly in varied directions
    // In light mode: 50% orbital framing particles, 50% drifting particles
    const type: ParticleType = isDark ? "drift" : i % 2 === 0 ? "orbital" : "drift";

    // Depth layer: 0.35 (far / subtle) to 1.15 (near / crisp)
    const depth = 0.35 + Math.random() * 0.8;
    const baseRadius = (isDark ? 1.2 + depth * 1.3 : 1.5 + depth * 1.5) * (compact ? 0.85 : 1.0);

    let colorType: ParticleColor;
    let baseAlpha: number;

    if (isDark) {
      // Dark Mode palette: Electric blue, cyan, deep sky, and luminous ice highlights
      const roll = Math.random();
      if (roll < 0.4) {
        colorType = "cyan"; // Vivid cyan (#38bdf8)
        baseAlpha = 0.45 + depth * 0.35;
      } else if (roll < 0.72) {
        colorType = "cobalt"; // Electric blue (#2563eb)
        baseAlpha = 0.42 + depth * 0.38;
      } else if (roll < 0.88) {
        colorType = "deep"; // Bright sky (#0ea5e9)
        baseAlpha = 0.38 + depth * 0.32;
      } else {
        colorType = "ice"; // Luminous ice white/cyan highlight (#e0f2fe)
        baseAlpha = 0.6 + depth * 0.35;
      }
    } else {
      // Light Mode palette: soft silver, cool gray, restrained cobalt blue, accent
      const roll = Math.random();
      if (roll < 0.42) {
        colorType = "silver";
        baseAlpha = 0.32 + depth * 0.28;
      } else if (roll < 0.72) {
        colorType = "gray";
        baseAlpha = 0.28 + depth * 0.26;
      } else if (roll < 0.9) {
        colorType = "cobalt";
        baseAlpha = 0.45 + depth * 0.35;
      } else {
        colorType = "accent";
        baseAlpha = 0.55 + depth * 0.35;
      }
    }

    // Invisible orbital parameters for light mode
    const orbitCx = cx + (Math.random() - 0.5) * w * 0.12;
    const orbitCy = cy + (Math.random() - 0.5) * h * 0.1;
    const rx = w * (0.24 + Math.random() * 0.3);
    const ry = h * (0.18 + Math.random() * 0.26);
    const tilt = (Math.random() - 0.5) * 0.55;
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() > 0.5 ? 1 : -1) * (0.0003 + Math.random() * 0.0005);

    // Initial positioning across the canvas with wide distribution
    let initX: number;
    let initY: number;

    if (isDark) {
      initX = Math.random() * w;
      initY = Math.random() * h;
    } else {
      const zone = i % 4;
      if (zone === 0) {
        initX = w * (0.04 + Math.random() * 0.22);
        initY = h * (0.15 + Math.random() * 0.7);
      } else if (zone === 1) {
        initX = w * (0.74 + Math.random() * 0.22);
        initY = h * (0.15 + Math.random() * 0.7);
      } else if (zone === 2) {
        initX = w * (0.18 + Math.random() * 0.64);
        initY = h * (0.12 + Math.random() * 0.18);
      } else {
        initX = w * (0.18 + Math.random() * 0.64);
        initY = h * (0.72 + Math.random() * 0.18);
      }
    }

    // Varied drift vectors in different directions (slow, organic movement)
    const angleRad = Math.random() * Math.PI * 2;
    const moveSpeed = 0.08 + Math.random() * 0.14;
    const vx = Math.cos(angleRad) * moveSpeed;
    const vy = Math.sin(angleRad) * moveSpeed;
    const driftPhase = Math.random() * Math.PI * 2;
    const driftFreq = 0.0006 + Math.random() * 0.0012;

    // Sparkle breathing cycle (every 6-14s)
    const sparklePeriod = 6 + Math.random() * 8;
    const sparkleTimer = Math.random() * sparklePeriod;

    particles.push({
      type,
      depth,
      baseRadius,
      currentRadius: baseRadius,
      colorType,
      baseAlpha,
      currentAlpha: baseAlpha,
      x: initX,
      y: initY,
      orbitCx,
      orbitCy,
      rx,
      ry,
      tilt,
      angle,
      speed,
      vx,
      vy,
      driftPhase,
      driftFreq,
      sparkleTimer,
      sparklePeriod,
      reactionEnergy: 0,
    });
  }

  return particles;
}

/**
 * Premium animated studio dots and atmospheric lighting system (DOTS ONLY, ZERO LINES).
 * - Light Mode: Pure white background with subtle silver/cobalt floating dots and soft center highlight.
 * - Dark Mode: Deep midnight navy (#080D19) with 20–35 floating luminous blue/cyan points,
 *   subtle radial blue glow behind active project, and non-blocking contact shadow grounding.
 * - Multi-depth parallax reacting to pointer movement.
 * - Featured-card excitation wave when selected card changes.
 * - Occasional gentle sparkle breaths without distracting flashing.
 * - Non-interactive (`pointer-events-none`) so cards retain 100% responsiveness.
 */
/* eslint-disable react-hooks/immutability -- canvas 2D frame loop mutates particle objects imperatively by design */
export function StudioBackdrop({
  selected,
  total,
  reduced = false,
  compact = false,
  active = true,
  isDark = false,
  className,
}: StudioBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const prevSelectedRef = useRef<number | null>(selected);

  // Horizontal offset for the subtle selected card ambient highlight
  const selectedOffset = useMemo(() => {
    if (selected === null || total <= 1) return 0;
    const norm = (selected - (total - 1) / 2) / Math.max(1, (total - 1) / 2);
    return Math.round(norm * (compact ? 120 : 260));
  }, [selected, total, compact]);

  // Trigger excitation wave when selected card changes
  useEffect(() => {
    if (prevSelectedRef.current !== selected && selected !== null && particlesRef.current.length > 0) {
      prevSelectedRef.current = selected;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      // Focal area of the newly selected card
      const focalX = w * (0.5 + ((selected - (total - 1) / 2) / Math.max(1, total - 1)) * 0.42);
      const focalY = h * 0.5;
      const maxRadius = w * 0.42;

      for (const p of particlesRef.current) {
        const dist = Math.hypot(p.x - focalX, p.y - focalY);
        if (dist < maxRadius) {
          const force = (1 - dist / maxRadius) * 0.85;
          p.reactionEnergy = Math.max(p.reactionEnergy, force);
        }
      }
    } else {
      prevSelectedRef.current = selected;
    }
  }, [selected, total]);

  // Setup canvas and particle animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Dark mode: 20-35 particles (approx 22 on compact, 30 on desktop)
      // Light mode: 26 on compact, 48 on desktop
      const count = isDark ? (compact ? 22 : 30) : compact ? 26 : 48;
      particlesRef.current = createParticles(width, height, count, compact, isDark);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    // Subtle pointer parallax listener
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerRef.current.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerRef.current.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Static render for reduced motion
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      for (const p of particlesRef.current) {
        if (p.type === "orbital") {
          const ca = Math.cos(p.angle);
          const sa = Math.sin(p.angle);
          const ct = Math.cos(p.tilt);
          const st = Math.sin(p.tilt);
          p.x = p.orbitCx + p.rx * ca * ct - p.ry * sa * st;
          p.y = p.orbitCy + p.rx * ca * st + p.ry * sa * ct;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.baseRadius, 0, Math.PI * 2);
        if (isDark) {
          if (p.colorType === "cyan") ctx.fillStyle = `rgba(56, 189, 248, ${p.baseAlpha})`;
          else if (p.colorType === "cobalt") ctx.fillStyle = `rgba(37, 99, 235, ${p.baseAlpha})`;
          else if (p.colorType === "deep") ctx.fillStyle = `rgba(14, 165, 233, ${p.baseAlpha})`;
          else ctx.fillStyle = `rgba(224, 242, 254, ${p.baseAlpha})`;
        } else {
          if (p.colorType === "cobalt") ctx.fillStyle = `rgba(37, 99, 235, ${p.baseAlpha})`;
          else if (p.colorType === "accent") ctx.fillStyle = `rgba(59, 130, 246, ${p.baseAlpha})`;
          else if (p.colorType === "gray") ctx.fillStyle = `rgba(100, 116, 139, ${p.baseAlpha})`;
          else ctx.fillStyle = `rgba(148, 163, 184, ${p.baseAlpha})`;
        }
        ctx.fill();
      }
      return () => {
        resizeObserver.disconnect();
        window.removeEventListener("pointermove", onPointerMove);
      };
    }

    // Animation frame loop
    const render = (timeMs: number) => {
      if (!active) {
        animRef.current = requestAnimationFrame(render);
        return;
      }

      const dt = lastTimeRef.current ? Math.min((timeMs - lastTimeRef.current) / 1000, 1 / 30) : 1 / 60;
      lastTimeRef.current = timeMs;

      // Pointer damping for smooth parallax
      const ptr = pointerRef.current;
      ptr.x += (ptr.tx - ptr.x) * 0.05;
      ptr.y += (ptr.ty - ptr.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const focalCenterX = width * 0.5 + (selectedOffset || 0) * 0.4;
      const focalCenterY = height * 0.5;
      const proximityRadius = width * 0.32;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Position update
        if (p.type === "orbital") {
          p.angle += p.speed * (1 + p.reactionEnergy * 0.7);
          const ca = Math.cos(p.angle);
          const sa = Math.sin(p.angle);
          const ct = Math.cos(p.tilt);
          const st = Math.sin(p.tilt);
          p.x = p.orbitCx + p.rx * ca * ct - p.ry * sa * st;
          p.y = p.orbitCy + p.rx * ca * st + p.ry * sa * ct;
        } else {
          // Continuous multi-directional drift with gentle wave curvature
          p.driftPhase += dt * p.driftFreq * 60;
          const curveX = Math.sin(p.driftPhase) * 0.16;
          const curveY = Math.cos(p.driftPhase) * 0.14;
          p.x += (p.vx + curveX) * (1 + p.reactionEnergy * 0.6);
          p.y += (p.vy + curveY) * (1 + p.reactionEnergy * 0.6);

          // Soft boundary wrap-around
          if (p.x < -30) p.x = width + 30;
          if (p.x > width + 30) p.x = -30;
          if (p.y < -30) p.y = height + 30;
          if (p.y > height + 30) p.y = -30;
        }

        // 2. Sparkle breathing cycle
        p.sparkleTimer += dt;
        if (p.sparkleTimer > p.sparklePeriod) p.sparkleTimer = 0;
        const sparkleProgress = p.sparkleTimer / 1.8;
        let sparkleBoost = 0;
        if (sparkleProgress <= 1) {
          sparkleBoost = Math.sin(sparkleProgress * Math.PI) * 0.34;
        }

        // 3. Selection excitation decay
        if (p.reactionEnergy > 0.01) {
          p.reactionEnergy *= 0.94;
        } else {
          p.reactionEnergy = 0;
        }

        // 4. Subtle brightness boost for particles near the centerpiece in dark mode
        let centerBoost = 0;
        if (isDark) {
          const distToCenter = Math.hypot(p.x - focalCenterX, p.y - focalCenterY);
          if (distToCenter < proximityRadius) {
            centerBoost = (1 - distToCenter / proximityRadius) * 0.24;
          }
        }

        // 5. Parallax depth offset
        const drawX = p.x + ptr.x * 18 * p.depth;
        const drawY = p.y + ptr.y * 12 * p.depth;

        // 6. Alpha & Radius dynamics
        p.currentAlpha = Math.min(
          0.98,
          p.baseAlpha + sparkleBoost + p.reactionEnergy * 0.35 + centerBoost,
        );
        p.currentRadius =
          p.baseRadius * (1 + sparkleBoost * 0.2 + p.reactionEnergy * 0.2 + centerBoost * 0.15);

        // 7. Draw dot (circles only — ZERO lines)
        ctx.beginPath();
        ctx.arc(drawX, drawY, p.currentRadius, 0, Math.PI * 2);

        if (isDark) {
          if (p.colorType === "cyan") {
            ctx.fillStyle = `rgba(56, 189, 248, ${p.currentAlpha})`;
            ctx.shadowColor = "rgba(56, 189, 248, 0.45)";
            ctx.shadowBlur = sparkleBoost > 0.12 || centerBoost > 0.1 ? 5 : 2;
          } else if (p.colorType === "cobalt") {
            ctx.fillStyle = `rgba(37, 99, 235, ${p.currentAlpha})`;
            ctx.shadowColor = "rgba(37, 99, 235, 0.4)";
            ctx.shadowBlur = 3;
          } else if (p.colorType === "deep") {
            ctx.fillStyle = `rgba(14, 165, 233, ${p.currentAlpha})`;
            ctx.shadowColor = "rgba(14, 165, 233, 0.35)";
            ctx.shadowBlur = 3;
          } else {
            // ice white luminous highlight
            ctx.fillStyle = `rgba(224, 242, 254, ${p.currentAlpha})`;
            ctx.shadowColor = "rgba(224, 242, 254, 0.65)";
            ctx.shadowBlur = 6;
          }
        } else {
          if (p.colorType === "cobalt") {
            ctx.fillStyle = `rgba(37, 99, 235, ${p.currentAlpha})`;
          } else if (p.colorType === "accent") {
            ctx.fillStyle = `rgba(59, 130, 246, ${p.currentAlpha})`;
          } else if (p.colorType === "gray") {
            ctx.fillStyle = `rgba(100, 116, 139, ${p.currentAlpha})`;
          } else {
            ctx.fillStyle = `rgba(148, 163, 184, ${p.currentAlpha})`;
          }

          if (p.colorType === "accent" || sparkleBoost > 0.18) {
            ctx.shadowColor =
              p.colorType === "accent" ? "rgba(37, 99, 235, 0.45)" : "rgba(148, 163, 184, 0.35)";
            ctx.shadowBlur = 4;
          } else {
            ctx.shadowBlur = 0;
          }
        }

        ctx.fill();
      }

      ctx.shadowBlur = 0;
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [reduced, compact, active, isDark, selectedOffset]);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden select-none", className)}
    >
      {/* ── Soft Ambient Lighting ────────────────────────────────────────── */}
      {isDark ? (
        <>
          {/* Dark mode: deep navy atmospheric background glow slightly illuminated around centerpiece */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-[560px] w-[860px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.13)_0%,rgba(14,165,233,0.04)_45%,transparent_72%)] blur-2xl" />

          {/* Dark mode: subtle radial blue glow behind the active/selected project card */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 h-[440px] w-[640px] -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.22)_0%,rgba(56,189,248,0.08)_40%,transparent_70%)] blur-3xl transition-transform duration-700 ease-out"
            style={{
              transform: `translate(calc(-50% + ${selectedOffset}px), -50%)`,
            }}
          />
        </>
      ) : (
        <>
          {/* Light mode: pure neutral center luminosity framing the featured card */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,1)_0%,rgba(248,250,252,0.6)_45%,transparent_72%)]" />

          {/* Light mode: subtle cobalt ambient highlight tracking the selected card */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 h-[380px] w-[500px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.035)_0%,rgba(37,99,235,0.008)_45%,transparent_70%)] blur-2xl transition-transform duration-700 ease-out"
            style={{
              transform: `translate(calc(-50% + ${selectedOffset}px), -50%)`,
            }}
          />
        </>
      )}

      {/* ── Animated Particles Canvas (DOTS ONLY, ZERO LINES) ────────────── */}
      <canvas ref={canvasRef} className="absolute inset-0 size-full pointer-events-none" />
    </div>
  );
}
/* eslint-enable react-hooks/immutability */
