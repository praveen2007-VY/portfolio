/**
 * Premium Web Audio API Signature UI Sound Synthesizer & Manager
 *
 * Synthesizes rich, multi-layered, technology-inspired interaction sounds
 * client-side using native Web Audio API (zero external audio file dependencies).
 * Features DynamicsCompressor for proper gain staging, crisp transient definition,
 * warm mechanical body resonance, and persistent master volume control (default 70%).
 */

export type SoundType =
  | "click"
  | "nav"
  | "select"
  | "open"
  | "close"
  | "theme"
  | "toggle-on"
  | "toggle-off"
  | "success";

const SOUND_STORAGE_KEY = "portfolio-sound-enabled";
const VOLUME_STORAGE_KEY = "portfolio-sound-volume";
const MIN_COOLDOWN_MS = 35;
const BASE_MASTER_SCALE = 0.45;

// Shared audio context singleton & nodes
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let lastSoundTime = 0;

// Centralized state
let soundEnabled = true;
let volume = 70; // 0 - 100 (default 70%)
const listeners = new Set<() => void>();

// Initialize stored preferences in browser
if (typeof window !== "undefined") {
  try {
    const storedSound = localStorage.getItem(SOUND_STORAGE_KEY);
    if (storedSound !== null) {
      soundEnabled = storedSound === "true";
    }

    const storedVol = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (storedVol !== null) {
      const parsed = parseInt(storedVol, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        volume = parsed;
      }
    }
  } catch {
    soundEnabled = true;
    volume = 70;
  }

  // Cross-tab synchronization
  window.addEventListener("storage", (e) => {
    let changed = false;
    if (e.key === SOUND_STORAGE_KEY && e.newValue !== null) {
      soundEnabled = e.newValue === "true";
      changed = true;
    }
    if (e.key === VOLUME_STORAGE_KEY && e.newValue !== null) {
      const v = parseInt(e.newValue, 10);
      if (!isNaN(v)) {
        volume = Math.max(0, Math.min(100, v));
        changed = true;
      }
    }
    if (changed) {
      updateMasterGain();
      listeners.forEach((fn) => fn());
    }
  });
}

function updateMasterGain(): void {
  if (!masterGain || !audioCtx) return;
  const effective = soundEnabled ? (volume / 100) * BASE_MASTER_SCALE : 0;
  masterGain.gain.setValueAtTime(effective, audioCtx.currentTime);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      // @ts-expect-error -- WebKit prefixed legacy context
      window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      audioCtx = new AudioContextClass();

      // Master output limiter/compressor for punchy clarity without clipping on laptop speakers
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
      compressor.knee.setValueAtTime(12, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(4, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.002, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.06, audioCtx.currentTime);
      compressor.connect(audioCtx.destination);

      masterGain = audioCtx.createGain();
      updateMasterGain();
      masterGain.connect(compressor);
    } catch {
      audioCtx = null;
      masterGain = null;
      compressor = null;
    }
  }

  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/** Check if sound is currently enabled */
export function isSoundEnabled(): boolean {
  return soundEnabled && volume > 0;
}

/** Get current volume level (0 - 100) */
export function getVolume(): number {
  return volume;
}

/** Subscribe to sound & volume changes */
export function subscribeSound(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/** Set sound enabled preference */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {}
  updateMasterGain();
  listeners.forEach((fn) => fn());
}

/** Set volume level (0 - 100) */
export function setVolume(newVolume: number): void {
  volume = Math.max(0, Math.min(100, Math.round(newVolume)));
  if (volume === 0 && soundEnabled) {
    soundEnabled = false;
  } else if (volume > 0 && !soundEnabled) {
    soundEnabled = true;
  }
  try {
    localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    localStorage.setItem(SOUND_STORAGE_KEY, String(soundEnabled));
  } catch {}
  updateMasterGain();
  listeners.forEach((fn) => fn());
}

/** Toggle sound enabled preference */
export function toggleSound(): boolean {
  if (soundEnabled && volume > 0) {
    // Turning off: play subtle descending cue then mute
    playSound("toggle-off", true);
    setSoundEnabled(false);
  } else {
    // Turning on: restore volume if at 0, enable, and play crisp activation chime
    if (volume === 0) {
      volume = 70;
      try {
        localStorage.setItem(VOLUME_STORAGE_KEY, "70");
      } catch {}
    }
    setSoundEnabled(true);
    playSound("toggle-on", true);
  }
  return soundEnabled;
}

/**
 * Play a synthesized signature sound effect.
 * @param type Sound preset identifier
 * @param force If true, bypasses muted state (used for activation chime)
 */
export function playSound(type: SoundType = "click", force = false): void {
  if (!force && (!soundEnabled || volume <= 0)) return;
  if (typeof window === "undefined") return;

  const now = performance.now();
  if (now - lastSoundTime < MIN_COOLDOWN_MS) return;
  lastSoundTime = now;

  const ctx = getAudioContext();
  if (!ctx || !masterGain) return;

  updateMasterGain();
  const t0 = ctx.currentTime;

  try {
    switch (type) {
      case "click": {
        // Rich layered confirmation click (~50ms)
        // Layer 1: Sharp mechanical micro-transient
        const clickOsc = ctx.createOscillator();
        const clickFilter = ctx.createBiquadFilter();
        const clickGain = ctx.createGain();

        clickOsc.type = "sine";
        clickOsc.frequency.setValueAtTime(1450, t0);
        clickOsc.frequency.exponentialRampToValueAtTime(420, t0 + 0.02);

        clickFilter.type = "highpass";
        clickFilter.frequency.setValueAtTime(600, t0);

        clickGain.gain.setValueAtTime(0.001, t0);
        clickGain.gain.linearRampToValueAtTime(0.18, t0 + 0.001);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.02);

        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(masterGain);

        clickOsc.start(t0);
        clickOsc.stop(t0 + 0.022);

        // Layer 2: Warm acoustic body resonant tap
        const bodyOsc = ctx.createOscillator();
        const bodyFilter = ctx.createBiquadFilter();
        const bodyGain = ctx.createGain();

        bodyOsc.type = "triangle";
        bodyOsc.frequency.setValueAtTime(480, t0);
        bodyOsc.frequency.exponentialRampToValueAtTime(190, t0 + 0.048);

        bodyFilter.type = "lowpass";
        bodyFilter.frequency.setValueAtTime(2200, t0);

        bodyGain.gain.setValueAtTime(0.001, t0);
        bodyGain.gain.linearRampToValueAtTime(0.22, t0 + 0.003);
        bodyGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.048);

        bodyOsc.connect(bodyFilter);
        bodyFilter.connect(bodyGain);
        bodyGain.connect(masterGain);

        bodyOsc.start(t0);
        bodyOsc.stop(t0 + 0.05);
        bodyOsc.onended = () => {
          bodyOsc.disconnect();
          bodyFilter.disconnect();
          bodyGain.disconnect();
          clickOsc.disconnect();
          clickFilter.disconnect();
          clickGain.disconnect();
        };
        break;
      }

      case "nav": {
        // Premium mechanical digital click (~40ms)
        // Snappy tactile ceramic micro-impulse + warm subtle wood/plastic resonance
        const snap = ctx.createOscillator();
        const snapGain = ctx.createGain();
        snap.type = "sine";
        snap.frequency.setValueAtTime(1850, t0);
        snap.frequency.exponentialRampToValueAtTime(620, t0 + 0.015);

        snapGain.gain.setValueAtTime(0.001, t0);
        snapGain.gain.linearRampToValueAtTime(0.24, t0 + 0.001);
        snapGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.015);

        snap.connect(snapGain);
        snapGain.connect(masterGain);
        snap.start(t0);
        snap.stop(t0 + 0.017);

        const tap = ctx.createOscillator();
        const tapFilter = ctx.createBiquadFilter();
        const tapGain = ctx.createGain();

        tap.type = "sine";
        tap.frequency.setValueAtTime(540, t0);
        tap.frequency.exponentialRampToValueAtTime(240, t0 + 0.038);

        tapFilter.type = "lowpass";
        tapFilter.frequency.setValueAtTime(1800, t0);

        tapGain.gain.setValueAtTime(0.001, t0);
        tapGain.gain.linearRampToValueAtTime(0.19, t0 + 0.002);
        tapGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);

        tap.connect(tapFilter);
        tapFilter.connect(tapGain);
        tapGain.connect(masterGain);

        tap.start(t0);
        tap.stop(t0 + 0.04);
        tap.onended = () => {
          tap.disconnect();
          tapFilter.disconnect();
          tapGain.disconnect();
          snap.disconnect();
          snapGain.disconnect();
        };
        break;
      }

      case "select": {
        // Distinctive futuristic two-tone chime (~95ms)
        // Note 1: E5 (659Hz) -> Note 2: B5 (987Hz) with harmonic richness
        const tone1 = ctx.createOscillator();
        const tone1Gain = ctx.createGain();
        tone1.type = "sine";
        tone1.frequency.setValueAtTime(659.25, t0);

        tone1Gain.gain.setValueAtTime(0.001, t0);
        tone1Gain.gain.linearRampToValueAtTime(0.2, t0 + 0.003);
        tone1Gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.042);

        tone1.connect(tone1Gain);
        tone1Gain.connect(masterGain);
        tone1.start(t0);
        tone1.stop(t0 + 0.044);

        const tone2 = ctx.createOscillator();
        const harmonic = ctx.createOscillator();
        const tone2Gain = ctx.createGain();

        tone2.type = "triangle";
        tone2.frequency.setValueAtTime(987.77, t0 + 0.035);

        harmonic.type = "sine";
        harmonic.frequency.setValueAtTime(1975.53, t0 + 0.035); // B6 shimmer

        tone2Gain.gain.setValueAtTime(0.001, t0);
        tone2Gain.gain.setValueAtTime(0.001, t0 + 0.035);
        tone2Gain.gain.linearRampToValueAtTime(0.22, t0 + 0.04);
        tone2Gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.095);

        tone2.connect(tone2Gain);
        harmonic.connect(tone2Gain);
        tone2Gain.connect(masterGain);

        tone2.start(t0 + 0.035);
        harmonic.start(t0 + 0.035);
        tone2.stop(t0 + 0.098);
        harmonic.stop(t0 + 0.098);

        tone2.onended = () => {
          tone1.disconnect();
          tone1Gain.disconnect();
          tone2.disconnect();
          harmonic.disconnect();
          tone2Gain.disconnect();
        };
        break;
      }

      case "open": {
        // Smooth cinematic ascending tone (~130ms)
        // Upward frequency sweep with expanding bandpass filter for spatial airy warmth
        const osc = ctx.createOscillator();
        const shimmer = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(360, t0);
        osc.frequency.exponentialRampToValueAtTime(720, t0 + 0.13);

        shimmer.type = "triangle";
        shimmer.frequency.setValueAtTime(720, t0);
        shimmer.frequency.exponentialRampToValueAtTime(1440, t0 + 0.13);

        filter.type = "bandpass";
        filter.frequency.setValueAtTime(900, t0);
        filter.frequency.exponentialRampToValueAtTime(2200, t0 + 0.13);
        filter.Q.setValueAtTime(1.1, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.22, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);

        osc.connect(filter);
        shimmer.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t0);
        shimmer.start(t0);
        osc.stop(t0 + 0.135);
        shimmer.stop(t0 + 0.135);

        osc.onended = () => {
          osc.disconnect();
          shimmer.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        break;
      }

      case "close": {
        // Elegant descending tone (~100ms)
        // Gentle downward sweep resolving to warm acoustic body
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(680, t0);
        osc.frequency.exponentialRampToValueAtTime(310, t0 + 0.1);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1600, t0);
        filter.frequency.exponentialRampToValueAtTime(800, t0 + 0.1);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.18, t0 + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t0);
        osc.stop(t0 + 0.105);
        osc.onended = () => {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        break;
      }

      case "theme": {
        // Premium transition sound (~140ms)
        // Distinctive celestial sweep with harmonic dual-wave body
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, t0); // A4
        osc1.frequency.exponentialRampToValueAtTime(659.25, t0 + 0.07); // E5
        osc1.frequency.exponentialRampToValueAtTime(880, t0 + 0.14); // A5

        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(554.37, t0); // C#5
        osc2.frequency.exponentialRampToValueAtTime(830.61, t0 + 0.07); // G#5
        osc2.frequency.exponentialRampToValueAtTime(1108.73, t0 + 0.14); // C#6

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(2600, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.18, t0 + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + 0.145);
        osc2.stop(t0 + 0.145);

        osc1.onended = () => {
          osc1.disconnect();
          osc2.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        break;
      }

      case "toggle-on": {
        // Memorable activation chime (~120ms)
        // Sparkling 3-note ascending arpeggio: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
        const notes = [
          { f: 523.25, t: 0, d: 0.038 },
          { f: 659.25, t: 0.036, d: 0.04 },
          { f: 783.99, t: 0.072, d: 0.06 },
        ];

        notes.forEach(({ f, t, d }, i) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(f, t0 + t);

          g.gain.setValueAtTime(0.001, t0 + t);
          g.gain.linearRampToValueAtTime(0.2, t0 + t + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d);

          osc.connect(g);
          g.connect(masterGain!);

          osc.start(t0 + t);
          osc.stop(t0 + t + d + 0.005);

          if (i === notes.length - 1) {
            osc.onended = () => {
              osc.disconnect();
              g.disconnect();
            };
          }
        });
        break;
      }

      case "toggle-off": {
        // Soft descending feedback tone (~85ms)
        // Note 1: E5 (659Hz) -> Note 2: A4 (440Hz)
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, t0);
        osc.frequency.setValueAtTime(440.0, t0 + 0.038);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1500, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(0.18, t0 + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.038);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(t0);
        osc.stop(t0 + 0.088);
        osc.onended = () => {
          osc.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        break;
      }

      case "success": {
        // Rich futuristic confirmation chord (C5 + E5 + G5 + C6) (~140ms)
        const freqs = [523.25, 659.25, 783.99, 1046.5];
        freqs.forEach((freq) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, t0);

          g.gain.setValueAtTime(0.001, t0);
          g.gain.linearRampToValueAtTime(0.14, t0 + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);

          osc.connect(g);
          g.connect(masterGain!);

          osc.start(t0);
          osc.stop(t0 + 0.145);
        });
        break;
      }
    }
  } catch {
    // Graceful silent fallback if AudioContext is interrupted
  }
}
