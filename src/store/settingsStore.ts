"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { story } from "@/config/story";
import type { Language } from "@/types/story";
import type { QualityTier } from "@/types/game";

export type QualitySetting = "auto" | QualityTier;
export type MotionSetting = "system" | "reduced" | "full";
export type ShadowSetting = "auto" | "off" | QualityTier;
export type TextSizeSetting = "small" | "medium" | "large";

/** Allowed ranges for the numeric settings (shared by the store and the UI). */
export const SETTING_RANGES = {
  cameraSensitivity: { min: 0.25, max: 2, step: 0.05 },
  movementSensitivity: { min: 0.5, max: 1.5, step: 0.05 },
  particleDensity: { min: 0.25, max: 1.5, step: 0.05 },
  resolutionScale: { min: 0.5, max: 1.5, step: 0.05 },
  animationIntensity: { min: 0.25, max: 1, step: 0.05 },
} as const;

export interface SettingsState {
  /* audio */
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  muted: boolean;
  /* graphics */
  quality: QualitySetting;
  shadowQuality: ShadowSetting;
  particleDensity: number;
  postProcessing: boolean;
  resolutionScale: number;
  /* gameplay */
  motion: MotionSetting;
  cameraSensitivity: number;
  movementSensitivity: number;
  invertY: boolean;
  joystickSide: "left" | "right";
  controlHints: boolean;
  showHud: boolean;
  /* accessibility */
  subtitles: boolean;
  textSize: TextSizeSetting;
  animationIntensity: number;
  language: Language;
  showPerformance: boolean;
  /** Has the player dismissed the movement tutorial once? */
  controlsSeen: boolean;

  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  setAmbientVolume: (v: number) => void;
  toggleMuted: () => void;
  setMuted: (m: boolean) => void;
  setQuality: (q: QualitySetting) => void;
  setShadowQuality: (q: ShadowSetting) => void;
  setParticleDensity: (v: number) => void;
  setPostProcessing: (v: boolean) => void;
  setResolutionScale: (v: number) => void;
  setMotion: (m: MotionSetting) => void;
  setCameraSensitivity: (v: number) => void;
  setMovementSensitivity: (v: number) => void;
  setInvertY: (v: boolean) => void;
  setJoystickSide: (s: "left" | "right") => void;
  setControlHints: (v: boolean) => void;
  setShowHud: (v: boolean) => void;
  setSubtitles: (v: boolean) => void;
  setTextSize: (v: TextSizeSetting) => void;
  setAnimationIntensity: (v: number) => void;
  setLanguage: (l: Language) => void;
  setShowPerformance: (v: boolean) => void;
  setControlsSeen: (v: boolean) => void;
  /** Restore every option to its default (progress is untouched). */
  resetToDefaults: () => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clampRange = (v: number, r: { min: number; max: number }) => Math.min(r.max, Math.max(r.min, Number.isFinite(v) ? v : r.min));

export const SETTINGS_DEFAULTS = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  ambientVolume: 0.7,
  muted: false,
  quality: "auto" as QualitySetting,
  shadowQuality: "auto" as ShadowSetting,
  particleDensity: 1,
  postProcessing: true,
  resolutionScale: 1,
  motion: "system" as MotionSetting,
  cameraSensitivity: 1,
  movementSensitivity: 1,
  invertY: false,
  joystickSide: "left" as const,
  controlHints: true,
  showHud: true,
  subtitles: true,
  textSize: "medium" as TextSizeSetting,
  animationIntensity: 1,
  language: story.language,
  showPerformance: false,
};

/** Keys that are written to localStorage (everything except the actions). */
const PERSISTED_KEYS = [...(Object.keys(SETTINGS_DEFAULTS) as Array<keyof typeof SETTINGS_DEFAULTS>), "controlsSeen"] as const;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...SETTINGS_DEFAULTS,
      controlsSeen: false,

      setMasterVolume: (v) => set({ masterVolume: clamp01(v) }),
      setMusicVolume: (v) => set({ musicVolume: clamp01(v) }),
      setSfxVolume: (v) => set({ sfxVolume: clamp01(v) }),
      setAmbientVolume: (v) => set({ ambientVolume: clamp01(v) }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      setMuted: (muted) => set({ muted }),
      setQuality: (quality) => set({ quality }),
      setShadowQuality: (shadowQuality) => set({ shadowQuality }),
      setParticleDensity: (v) => set({ particleDensity: clampRange(v, SETTING_RANGES.particleDensity) }),
      setPostProcessing: (postProcessing) => set({ postProcessing }),
      setResolutionScale: (v) => set({ resolutionScale: clampRange(v, SETTING_RANGES.resolutionScale) }),
      setMotion: (motion) => set({ motion }),
      setCameraSensitivity: (v) => set({ cameraSensitivity: clampRange(v, SETTING_RANGES.cameraSensitivity) }),
      setMovementSensitivity: (v) => set({ movementSensitivity: clampRange(v, SETTING_RANGES.movementSensitivity) }),
      setInvertY: (invertY) => set({ invertY }),
      setJoystickSide: (joystickSide) => set({ joystickSide }),
      setControlHints: (controlHints) => set({ controlHints }),
      setShowHud: (showHud) => set({ showHud }),
      setSubtitles: (subtitles) => set({ subtitles }),
      setTextSize: (textSize) => set({ textSize }),
      setAnimationIntensity: (v) => set({ animationIntensity: clampRange(v, SETTING_RANGES.animationIntensity) }),
      setLanguage: (language) => set({ language }),
      setShowPerformance: (showPerformance) => set({ showPerformance }),
      setControlsSeen: (controlsSeen) => set({ controlsSeen }),
      resetToDefaults: () => set({ ...SETTINGS_DEFAULTS }),
    }),
    {
      name: "ajtyh:settings:v1",
      version: 2,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s) => Object.fromEntries(PERSISTED_KEYS.map((k) => [k, s[k]])) as Pick<SettingsState, (typeof PERSISTED_KEYS)[number]>,
      // v1 saves simply lack the newer keys; `merge` below fills them from the defaults.
      migrate: (persisted) => persisted as Pick<SettingsState, (typeof PERSISTED_KEYS)[number]>,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SettingsState>;
        const next: SettingsState = { ...current };
        for (const key of PERSISTED_KEYS) {
          const value = saved[key];
          if (value === undefined || value === null) continue;
          if (typeof value !== typeof current[key]) continue; // corrupted entry → keep default
          (next as unknown as Record<string, unknown>)[key] = value;
        }
        // Re-clamp numbers so a hand-edited or out-of-date value can't break the game.
        next.masterVolume = clamp01(next.masterVolume);
        next.musicVolume = clamp01(next.musicVolume);
        next.sfxVolume = clamp01(next.sfxVolume);
        next.ambientVolume = clamp01(next.ambientVolume);
        next.cameraSensitivity = clampRange(next.cameraSensitivity, SETTING_RANGES.cameraSensitivity);
        next.movementSensitivity = clampRange(next.movementSensitivity, SETTING_RANGES.movementSensitivity);
        next.particleDensity = clampRange(next.particleDensity, SETTING_RANGES.particleDensity);
        next.resolutionScale = clampRange(next.resolutionScale, SETTING_RANGES.resolutionScale);
        next.animationIntensity = clampRange(next.animationIntensity, SETTING_RANGES.animationIntensity);
        return next;
      },
    },
  ),
);

/**
 * Global animation strength used by world animations (wind, bobbing, camera
 * shake…). Reduced motion caps it low; the accessibility slider scales it.
 */
export function getAnimationIntensity(): number {
  const s = useSettingsStore.getState();
  const base = s.animationIntensity;
  return prefersReducedMotion(s.motion) ? Math.min(base, 0.3) : base;
}

/** Resolve the effective reduced-motion preference (setting + OS). */
export function prefersReducedMotion(motion: MotionSetting): boolean {
  if (motion === "reduced") return true;
  if (motion === "full") return false;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
