export const SECRET_CLICK_COUNT = 5;
export const SECRET_CLICK_WINDOW_MS = 3000;

/**
 * Pure click counter for the hidden admin entry. Keeps only the timestamps
 * within the sliding window; triggers (and resets) on the Nth click.
 *
 * This only *discovers* the login page. It is not a security control.
 */
export function registerSecretClick(
  history: readonly number[],
  now: number,
  required = SECRET_CLICK_COUNT,
  windowMs = SECRET_CLICK_WINDOW_MS,
): { history: number[]; triggered: boolean } {
  const recent = history.filter((t) => now - t < windowMs && t <= now);
  recent.push(now);
  if (recent.length >= required) return { history: [], triggered: true };
  return { history: recent, triggered: false };
}

/** Clicks that should count: real pointer/touch clicks without modifier keys. */
export function isCountableClick(event: {
  detail: number;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  if (event.detail === 0) return false; // keyboard-activated
  if (event.button !== 0) return false;
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);
}
