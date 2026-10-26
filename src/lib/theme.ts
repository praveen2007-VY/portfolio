import type { Accent } from "@/types/portfolio";

/** Must match the [data-accent] palette in globals.css. */
export const ACCENT_HEX: Record<Accent, string> = {
  cobalt: "#1f45e0",
  electric: "#2563eb",
  indigo: "#4f46e5",
  ocean: "#0369a1",
  violet: "#6d28d9",
};

export const ACCENT_LABELS: Record<Accent, string> = {
  cobalt: "Cobalt",
  electric: "Electric blue",
  indigo: "Indigo",
  ocean: "Ocean",
  violet: "Violet",
};
