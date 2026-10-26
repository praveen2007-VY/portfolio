import { describe, expect, it } from "vitest";
import { isCountableClick, registerSecretClick } from "@/lib/utils/secret-clicks";

const click = (over: Partial<Parameters<typeof isCountableClick>[0]> = {}) => ({
  detail: 1,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
});

describe("registerSecretClick", () => {
  it("triggers on the fifth click within three seconds and resets", () => {
    let history: number[] = [];
    const times = [0, 400, 900, 1500, 2200];
    const results = times.map((t) => {
      const r = registerSecretClick(history, t);
      history = r.history;
      return r.triggered;
    });
    expect(results).toEqual([false, false, false, false, true]);
    expect(history).toEqual([]);
  });

  it("does not trigger when clicks are spread beyond the window", () => {
    let history: number[] = [];
    let triggered = false;
    for (const t of [0, 1000, 2000, 3100, 4200]) {
      const r = registerSecretClick(history, t);
      history = r.history;
      triggered ||= r.triggered;
    }
    expect(triggered).toBe(false);
    expect(history.length).toBeLessThan(5);
  });

  it("drops expired clicks from the window", () => {
    const r = registerSecretClick([0, 100, 200], 3500);
    expect(r.history).toEqual([3500]);
  });
});

describe("isCountableClick", () => {
  it("counts plain pointer clicks", () => expect(isCountableClick(click())).toBe(true));
  it("ignores keyboard-activated clicks", () => expect(isCountableClick(click({ detail: 0 }))).toBe(false));
  it("ignores modified clicks", () => {
    expect(isCountableClick(click({ metaKey: true }))).toBe(false);
    expect(isCountableClick(click({ ctrlKey: true }))).toBe(false);
  });
  it("ignores non-primary buttons", () => expect(isCountableClick(click({ button: 1 }))).toBe(false));
});
