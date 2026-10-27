import { describe, expect, it } from "vitest";
import {
  cameraPose,
  CARD_OFFSET_LIMIT,
  clampOffset,
  classifyGesture,
  computeLayout,
  DRAG_THRESHOLD,
  layoutExtentX,
} from "@/components/showcase/gallery/layout";

describe("gallery layout", () => {
  it("puts the featured card front and centre for any number of projects", () => {
    for (const n of [1, 2, 3, 5, 9]) {
      for (const featured of [0, n - 1]) {
        const slots = computeLayout(n, featured);
        expect(slots).toHaveLength(n);
        const f = slots[featured];
        expect(f.featured).toBe(true);
        expect(f.x).toBe(0);
        for (const [i, s] of slots.entries()) {
          if (i === featured) continue;
          expect(s.z, `n=${n} card ${i} behind featured`).toBeLessThan(f.z);
          expect(s.scale).toBeLessThan(f.scale);
        }
      }
    }
  });

  it("is a genuine, balanced 3D composition: distinct slots, mixed depths, cards facing the centre", () => {
    const slots = computeLayout(5, 0);
    const keys = new Set(slots.map((s) => `${s.x.toFixed(2)},${s.y.toFixed(2)},${s.z.toFixed(2)}`));
    expect(keys.size).toBe(5);
    expect(new Set(slots.map((s) => s.z.toFixed(2))).size).toBeGreaterThan(2);
    const left = slots.filter((s) => s.x < 0);
    const right = slots.filter((s) => s.x > 0);
    expect(Math.abs(left.length - right.length)).toBeLessThanOrEqual(1);
    for (const s of slots) if (s.x !== 0) expect(Math.sign(s.rotY)).toBe(-Math.sign(s.x));
  });

  it("clamps out-of-range featured indexes and handles zero projects", () => {
    expect(computeLayout(0, 0)).toEqual([]);
    expect(computeLayout(3, 7)[2].featured).toBe(true);
  });

  it("compacts the arrangement on small screens", () => {
    expect(layoutExtentX(computeLayout(5, 0, true))).toBeLessThan(layoutExtentX(computeLayout(5, 0)));
  });
});

describe("gestures and bounds", () => {
  it("treats small movements as clicks and larger ones as drags", () => {
    expect(classifyGesture(DRAG_THRESHOLD - 1, true, "mouse")).toBe("pending");
    expect(classifyGesture(DRAG_THRESHOLD + 1, true, "mouse")).toBe("card");
    expect(classifyGesture(DRAG_THRESHOLD + 1, false, "mouse")).toBe("scene");
    // Touch drags explore the scene (cards are selected with a tap).
    expect(classifyGesture(DRAG_THRESHOLD + 1, true, "touch")).toBe("scene");
  });

  it("keeps dragged cards within safe bounds", () => {
    expect(clampOffset({ x: 99, y: -99 })).toEqual({ x: CARD_OFFSET_LIMIT.x, y: -CARD_OFFSET_LIMIT.y });
    expect(clampOffset({ x: 0.3, y: -0.2 })).toEqual({ x: 0.3, y: -0.2 });
  });
});

describe("scroll-driven camera", () => {
  it("moves continuously, without jumps, from enter to exit", () => {
    const extent = layoutExtentX(computeLayout(3, 0));
    let prev = cameraPose(0, extent);
    for (let p = 0.002; p <= 1; p += 0.002) {
      const pose = cameraPose(p, extent);
      const step = Math.hypot(...pose.position.map((v, i) => v - prev.position[i]));
      expect(step, `jump at p=${p.toFixed(3)}`).toBeLessThan(0.12);
      prev = pose;
    }
  });

  it("frames the featured card at the middle of the sequence and pulls back at the end", () => {
    const extent = layoutExtentX(computeLayout(3, 0));
    const middle = cameraPose(0.5, extent);
    expect(Math.abs(middle.position[0])).toBeLessThan(0.05);
    expect(middle.position[2]).toBeLessThan(cameraPose(0, extent).position[2]);
    expect(cameraPose(1, extent).position[2]).toBeGreaterThan(middle.position[2]);
  });
});
