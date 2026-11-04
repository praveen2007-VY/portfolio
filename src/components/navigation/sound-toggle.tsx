"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SlidersHorizontal, Volume1, Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/components/portfolio/sound-provider";
import { cn } from "@/lib/utils/format";

type SoundToggleProps = {
  className?: string;
};

const emptySubscribe = () => () => {};

export function SoundToggle({ className }: SoundToggleProps) {
  const { soundEnabled, volume, setVolume, toggleSound, playSound } = useSound();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const enabled = mounted ? soundEnabled : true;
  const currentVolume = mounted ? volume : 70;

  // Handle outside click to dismiss popover
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 280);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = Number(e.target.value);
    setVolume(nextVal);
  };

  const handleSliderRelease = () => {
    // Play subtle preview click at the newly selected volume
    playSound("click");
  };

  const handlePreset = (level: number) => {
    setVolume(level);
    if (level > 0) {
      playSound("click");
    }
  };

  const handleSpeakerClick = () => {
    toggleSound();
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("relative flex items-center", className)}
    >
      {/* Integrated Audio Control Pill */}
      <div
        className={cn(
          "flex items-center rounded-xl border transition-all duration-300",
          enabled && currentVolume > 0
            ? "border-blue-200/80 bg-blue-50/70 shadow-[0_0_12px_rgba(37,99,235,0.18)] dark:border-sky-400/30 dark:bg-sky-400/10 dark:shadow-[0_0_14px_rgba(56,189,248,0.22)]"
            : "border-line/60 bg-paper/60 text-muted dark:border-white/10 dark:bg-white/5",
        )}
      >
        {/* Speaker Mute/Unmute Button */}
        <button
          type="button"
          data-sound="none"
          onClick={handleSpeakerClick}
          aria-label={enabled && currentVolume > 0 ? `Mute sound (${currentVolume}%)` : "Unmute sound"}
          title={enabled && currentVolume > 0 ? `Sound: ${currentVolume}% (Click to mute)` : "Sound: Muted (Click to unmute)"}
          className={cn(
            "group relative grid size-9 place-items-center rounded-l-xl transition-all duration-200",
            enabled && currentVolume > 0
              ? "text-blue-600 hover:text-blue-700 dark:text-sky-400 dark:hover:text-sky-300"
              : "text-muted hover:text-ink dark:text-white/60 dark:hover:text-white",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <span className="relative size-4.5">
            {/* Muted */}
            <VolumeX
              className={cn(
                "absolute inset-0 size-4.5 transition-all duration-200",
                !enabled || currentVolume === 0
                  ? "scale-100 opacity-100"
                  : "scale-0 -rotate-12 opacity-0",
              )}
              aria-hidden
            />
            {/* Low/Medium volume (1-49%) */}
            <Volume1
              className={cn(
                "absolute inset-0 size-4.5 transition-all duration-200",
                enabled && currentVolume > 0 && currentVolume < 50
                  ? "scale-100 opacity-100"
                  : "scale-0 rotate-12 opacity-0",
              )}
              aria-hidden
            />
            {/* Full volume (50-100%) */}
            <Volume2
              className={cn(
                "absolute inset-0 size-4.5 transition-all duration-200",
                enabled && currentVolume >= 50
                  ? "scale-100 opacity-100"
                  : "scale-0 rotate-12 opacity-0",
              )}
              aria-hidden
            />
          </span>
        </button>

        {/* Vertical divider */}
        <span
          className={cn(
            "h-4 w-px transition-colors",
            enabled && currentVolume > 0
              ? "bg-blue-200 dark:bg-sky-400/30"
              : "bg-line dark:bg-white/10",
          )}
          aria-hidden
        />

        {/* Volume Percentage Trigger */}
        <button
          type="button"
          data-sound="none"
          onClick={() => setIsOpen((prev) => !prev)}
          onMouseEnter={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label={`Sound volume: ${enabled ? currentVolume : 0}%. Click to adjust slider.`}
          className={cn(
            "flex items-center gap-1 rounded-r-xl px-2 py-1.5 font-mono text-[11px] font-semibold transition-all duration-200",
            enabled && currentVolume > 0
              ? "text-blue-700 hover:text-blue-800 dark:text-sky-300 dark:hover:text-white"
              : "text-muted hover:text-ink dark:text-white/60 dark:hover:text-white",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <span>{enabled && currentVolume > 0 ? `${currentVolume}%` : "OFF"}</span>
          <SlidersHorizontal className="size-3 opacity-60 transition-opacity hover:opacity-100" aria-hidden />
        </button>
      </div>

      {/* Floating Volume Slider Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Sound Volume Control"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="absolute right-0 top-full mt-2.5 z-50 w-64 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-[0_16px_40px_-8px_rgba(15,23,42,0.18)] backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-200 dark:border-white/12 dark:bg-[#0c1427]/95 dark:shadow-[0_20px_48px_rgba(0,0,0,0.7)]"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/8">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-sky-400/10 dark:text-sky-400">
                {enabled && currentVolume > 0 ? (
                  <Volume2 className="size-3.5" aria-hidden />
                ) : (
                  <VolumeX className="size-3.5" aria-hidden />
                )}
              </span>
              <span className="text-[12.5px] font-semibold text-slate-900 dark:text-ink">
                Sound Volume
              </span>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide",
                enabled && currentVolume > 0
                  ? "bg-blue-50 text-blue-700 dark:bg-sky-400/15 dark:text-sky-300"
                  : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-subtle",
              )}
            >
              {enabled && currentVolume > 0 ? `${currentVolume}%` : "Muted"}
            </span>
          </div>

          {/* Interactive Volume Slider */}
          <div className="pt-4 pb-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-2 dark:text-muted">
              <span>0%</span>
              <span className="text-slate-400 dark:text-muted/60">Master Gain</span>
              <span>100%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={enabled ? currentVolume : 0}
              onChange={handleSliderChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              aria-label="Adjust sound volume from 0 to 100 percent"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600 transition-all dark:bg-white/15 dark:accent-sky-400"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="mt-3 grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-100 dark:border-white/8">
            {[
              { label: "Mute", val: 0 },
              { label: "30%", val: 30 },
              { label: "70%", val: 70 },
              { label: "100%", val: 100 },
            ].map(({ label, val }) => {
              const isActive = (val === 0 && (!enabled || currentVolume === 0)) || (enabled && currentVolume === val);
              return (
                <button
                  key={label}
                  type="button"
                  data-sound="none"
                  onClick={() => handlePreset(val)}
                  className={cn(
                    "rounded-lg py-1 text-[11px] font-mono font-medium transition-all duration-150",
                    isActive
                      ? "bg-blue-600 text-white shadow-sm dark:bg-sky-400 dark:text-[#070b16]"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 dark:bg-white/8 dark:text-ink-2 dark:hover:bg-white/15 dark:hover:text-ink",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
