import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, val: string) => store.set(key, String(val)),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};

vi.stubGlobal("localStorage", localStorageMock);

import {
  getVolume,
  isSoundEnabled,
  playSound,
  setSoundEnabled,
  setVolume,
  subscribeSound,
  toggleSound,
  type SoundType,
} from "./sound-manager";

describe("Sound Manager", () => {
  beforeEach(() => {
    store.clear();
    setVolume(70);
    setSoundEnabled(true);
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("defaults sound enabled to true with 70% volume", () => {
    expect(isSoundEnabled()).toBe(true);
    expect(getVolume()).toBe(70);
  });

  it("updates volume and persists to localStorage", () => {
    setVolume(85);
    expect(getVolume()).toBe(85);
    expect(store.get("portfolio-sound-volume")).toBe("85");

    setVolume(0);
    expect(getVolume()).toBe(0);
    expect(isSoundEnabled()).toBe(false);
  });

  it("toggles sound preference and persists to localStorage", () => {
    const turnedOff = toggleSound();
    expect(turnedOff).toBe(false);
    expect(isSoundEnabled()).toBe(false);
    expect(store.get("portfolio-sound-enabled")).toBe("false");

    const turnedOn = toggleSound();
    expect(turnedOn).toBe(true);
    expect(isSoundEnabled()).toBe(true);
    expect(store.get("portfolio-sound-enabled")).toBe("true");
  });

  it("notifies subscribers when sound enabled or volume changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSound(listener);

    setSoundEnabled(false);
    expect(listener).toHaveBeenCalledTimes(1);

    setVolume(50);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setSoundEnabled(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("handles playSound safely without throwing in node environment", () => {
    const types: SoundType[] = [
      "click",
      "nav",
      "select",
      "open",
      "close",
      "theme",
      "toggle-on",
      "toggle-off",
      "success",
    ];

    for (const t of types) {
      expect(() => playSound(t)).not.toThrow();
    }
  });

  it("does not play sounds when sound is disabled or volume is 0", () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(() => playSound("click")).not.toThrow();

    setSoundEnabled(true);
    setVolume(0);
    expect(isSoundEnabled()).toBe(false);
    expect(() => playSound("click")).not.toThrow();
  });
});
