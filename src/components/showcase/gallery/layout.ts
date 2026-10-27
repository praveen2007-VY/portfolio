/**
 * Pure layout, camera and gesture math for the 3D project gallery.
 * Kept free of three.js so it can be unit-tested and reused by the DOM shell.
 */

export const CARD_W = 2.4;
export const CARD_H = 1.5;

/** How far an individual card may be dragged from its home slot (world units). */
export const CARD_OFFSET_LIMIT = { x: 1.6, y: 1.0 };
/** How far the whole gallery may be rotated by dragging (radians). */
export const YAW_LIMIT = 0.75;
export const PITCH_LIMIT = 0.22;
/** Pointer travel (px) before a press becomes a drag instead of a click. */
export const DRAG_THRESHOLD = 6;

export type CardSlot = {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  scale: number;
  featured: boolean;
};

/**
 * Featured card front and centre; the others alternate left/right in
 * widening arcs that step back in depth and turn toward the centre.
 * Works for any number of cards.
 */
export function computeLayout(count: number, featuredIndex: number, compact = false): CardSlot[] {
  const slots: CardSlot[] = new Array(Math.max(0, count));
  if (count === 0) return slots;
  const featured = Math.min(Math.max(featuredIndex, 0), count - 1);
  const spread = compact ? 0.62 : 1;

  slots[featured] = { x: 0, y: 0.15, z: 0.6, rotX: -0.02, rotY: 0, scale: compact ? 1.05 : 1.22, featured: true };

  let k = 0;
  for (let i = 0; i < count; i++) {
    if (i === featured) continue;
    const side = k % 2 === 0 ? -1 : 1;
    const ring = Math.floor(k / 2);
    slots[i] = {
      x: side * (2.75 + ring * 2.05) * spread,
      y: (ring % 2 === 0 ? 1 : -1) * (side === -1 ? 0.35 : -0.3),
      z: -0.9 - ring * (compact ? 1.6 : 1.35),
      rotX: 0.03 * side,
      rotY: -side * (0.28 + ring * 0.07),
      scale: Math.max(0.75, 0.95 - ring * 0.05),
      featured: false,
    };
    k++;
  }
  return slots;
}

/** Half-width of the arrangement in world units (used to size the camera sweep). */
export function layoutExtentX(slots: CardSlot[]): number {
  return slots.reduce((max, s) => Math.max(max, Math.abs(s.x) + (CARD_W * s.scale) / 2), CARD_W / 2);
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function clampOffset(o: { x: number; y: number }) {
  return {
    x: clamp(o.x, -CARD_OFFSET_LIMIT.x, CARD_OFFSET_LIMIT.x),
    y: clamp(o.y, -CARD_OFFSET_LIMIT.y, CARD_OFFSET_LIMIT.y),
  };
}

export type Gesture = "pending" | "card" | "scene";

/** A press becomes a card drag (mouse/pen on a card) or a scene drag once it travels far enough. */
export function classifyGesture(distance: number, onCard: boolean, pointerType: string): Gesture {
  if (distance < DRAG_THRESHOLD) return "pending";
  return onCard && pointerType !== "touch" ? "card" : "scene";
}

const smooth = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export type CameraPose = { position: [number, number, number]; target: [number, number, number] };

/**
 * Camera path driven by the section's scroll progress (0–1):
 *   enter   (0 – 0.18)  descend from high and far to eye level
 *   explore (0.18–0.82) sweep left → right through the arrangement, easing
 *                       closer at the middle where the featured card sits
 *   exit    (0.82–1)    pull back and rise so the page continues
 * Continuous at every boundary (no jumps).
 */
export function cameraPose(progress: number, extentX: number, compact = false): CameraPose {
  const p = clamp(progress, 0, 1);
  const baseZ = compact ? 12.5 : 9.6;
  const sweep = Math.min(extentX * 0.42, compact ? 1.2 : 3.2);

  const enter = smooth(p / 0.18);
  const explore = clamp((p - 0.18) / 0.64, 0, 1);
  const exit = smooth((p - 0.82) / 0.18);
  const e = smooth(explore);

  const x = mix(-sweep, sweep, e) * (1 - exit) * enter;
  const dolly = Math.sin(Math.PI * explore) * (compact ? 0.8 : 1.3);
  const z = mix(baseZ + 5.5, baseZ - dolly, enter) + exit * 4;
  const y = mix(3.4, 0.55, enter) + exit * 2.2;

  return {
    position: [x, y, z],
    // Aiming slightly above the cards places them below the section heading.
    target: [x * 0.35, mix(1.2, 0.5, enter) + exit * 0.9, -1],
  };
}
