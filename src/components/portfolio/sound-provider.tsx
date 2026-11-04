"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import {
  getVolume,
  isSoundEnabled,
  playSound,
  setSoundEnabled,
  setVolume,
  subscribeSound,
  toggleSound,
  type SoundType,
} from "@/lib/audio/sound-manager";

type SoundContextValue = {
  soundEnabled: boolean;
  volume: number;
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  toggleSound: () => boolean;
  playSound: (type?: SoundType) => void;
};

const SoundContext = createContext<SoundContextValue>({
  soundEnabled: true,
  volume: 70,
  setSoundEnabled: () => {},
  setVolume: () => {},
  toggleSound: () => true,
  playSound: () => {},
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe reactive subscriptions without hydration mismatch
  const soundEnabled = useSyncExternalStore(
    subscribeSound,
    isSoundEnabled,
    () => true, // Server snapshot: defaults to enabled
  );

  const volume = useSyncExternalStore(
    subscribeSound,
    getVolume,
    () => 70, // Server snapshot: defaults to 70%
  );

  // Global intelligent event delegator: provides distinct acoustic feedback
  // across navigation, buttons, controls, and dialogs.
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (!isSoundEnabled()) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      // Find closest interactive element
      const interactive = target.closest<HTMLElement>(
        "button, a, [role='button'], [role='tab'], input[type='submit'], input[type='button'], summary, [data-sound]",
      );
      if (!interactive) return;

      // Explicit opt-out
      const soundAttr = interactive.getAttribute("data-sound");
      if (soundAttr === "none") return;

      // Explicit sound attribute
      if (soundAttr) {
        playSound(soundAttr as SoundType);
        return;
      }

      // Close buttons
      const label = (
        interactive.getAttribute("aria-label") ||
        interactive.getAttribute("title") ||
        interactive.innerText ||
        ""
      ).toLowerCase();
      if (
        label.includes("close") ||
        label.includes("dismiss") ||
        interactive.classList.contains("close-btn")
      ) {
        playSound("close");
        return;
      }

      // Dialog / modal triggers
      if (
        interactive.getAttribute("aria-haspopup") === "dialog" ||
        interactive.hasAttribute("data-dialog-trigger")
      ) {
        playSound("open");
        return;
      }

      // Navigation links & tabs
      if (
        interactive.closest("nav") ||
        interactive.getAttribute("role") === "tab" ||
        interactive.getAttribute("href")?.startsWith("#")
      ) {
        playSound("nav");
        return;
      }

      // Default primary click for all other interactive controls
      playSound("click");
    };

    window.addEventListener("click", handleGlobalClick, { capture: true, passive: true });
    return () => {
      window.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, []);

  return (
    <SoundContext.Provider value={{ soundEnabled, volume, setSoundEnabled, setVolume, toggleSound, playSound }}>
      {children}
    </SoundContext.Provider>
  );
}

/** Hook to access global sound controls, volume slider state, and trigger sounds */
export function useSound(): SoundContextValue {
  return useContext(SoundContext);
}
