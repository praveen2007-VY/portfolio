"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * gallery         — immersive 3D gallery (desktop/tablet with a capable GPU)
 * gallery-compact — the same gallery tuned for small touch screens
 * carousel        — swipeable HTML cards (small screens without a capable GPU)
 * list            — stacked HTML cards: server render, reduced motion,
 *                   no/software WebGL, low-power devices or 3D disabled
 */
export type ShowcaseMode = "gallery" | "gallery-compact" | "carousel" | "list";

const NARROW = "(max-width: 767px)";
const REDUCED = "(prefers-reduced-motion: reduce)";

let gpuCapable: boolean | null = null;

/** Hardware-accelerated WebGL on a device with headroom for a 3D scene. */
function hasCapableGpu(): boolean {
  if (gpuCapable !== null) return gpuCapable;
  gpuCapable = false;
  try {
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    if (cores <= 4 || memory <= 4) return gpuCapable;
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return gpuCapable;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "";
    gpuCapable = !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    gpuCapable = false;
  }
  return gpuCapable;
}

function subscribe(onChange: () => void) {
  const queries = [window.matchMedia(NARROW), window.matchMedia(REDUCED)];
  for (const q of queries) q.addEventListener("change", onChange);
  return () => {
    for (const q of queries) q.removeEventListener("change", onChange);
  };
}

export function useShowcaseMode({ enable3d, reducedSetting }: { enable3d: boolean; reducedSetting: boolean }) {
  const getSnapshot = useCallback((): ShowcaseMode => {
    if (reducedSetting || window.matchMedia(REDUCED).matches) return "list";
    const narrow = window.matchMedia(NARROW).matches;
    const capable = enable3d && hasCapableGpu();
    if (narrow) return capable ? "gallery-compact" : "carousel";
    return capable ? "gallery" : "list";
  }, [enable3d, reducedSetting]);

  return useSyncExternalStore(subscribe, getSnapshot, () => "list" as const);
}
