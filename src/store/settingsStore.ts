"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { story } from "@/config/story";
import type { Language } from "@/types/story";
import type { QualityTier } from "@/types/game";

export type QualitySetting = "auto" | QualityTier;
export type MotionSetting = "system" | "reduced" | "full";

export interface SettingsState {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  quality: QualitySetting;
  motion: MotionSetting;
  cameraSensitivity: number;
  invertY: boolean;
  joystickSide: "left" | "right";
  subtitles: boolean;
  language: Language;
  showPerformance: boolean;
  /** Has the player dismissed the movement tutorial once? */
  controlsSeen: boolean;

  setMasterVolume: (v: number) => void;
  setMusicVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  toggleMuted: () => void;
  setMuted: (m: boolean) => void;
  setQuality: (q: QualitySetting) => void;
  setMotion: (m: MotionSetting) => void;
  setCameraSensitivity: (v: number) => void;
  setInvertY: (v: boolean) => void;
  setJoystickSide: (s: "left" | "right") => void;
  setSubtitles: (v: boolean) => void;
  setLanguage: (l: Language) => void;
  setShowPerformance: (v: boolean) => void;
  setControlsSeen: (v: boolean) => void;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      masterVolume: 0.8,
      musicVolume: 0.7,
      sfxVolume: 0.9,
      muted: false,
      quality: "auto",
      motion: "system",
      cameraSensitivity: 1,
      invertY: false,
      joystickSide: "left",
      subtitles: true,
      language: story.language,
      showPerformance: false,
      controlsSeen: false,

      setMasterVolume: (v) => set({ masterVolume: clamp01(v) }),
      setMusicVolume: (v) => set({ musicVolume: clamp01(v) }),
      setSfxVolume: (v) => set({ sfxVolume: clamp01(v) }),
      toggleMuted: () => set((s) => ({ muted: !s.muted })),
      setMuted: (muted) => set({ muted }),
      setQuality: (quality) => set({ quality }),
      setMotion: (motion) => set({ motion }),
      setCameraSensitivity: (v) => set({ cameraSensitivity: Math.min(2, Math.max(0.25, v)) }),
      setInvertY: (invertY) => set({ invertY }),
      setJoystickSide: (joystickSide) => set({ joystickSide }),
      setSubtitles: (subtitles) => set({ subtitles }),
      setLanguage: (language) => set({ language }),
      setShowPerformance: (showPerformance) => set({ showPerformance }),
      setControlsSeen: (controlsSeen) => set({ controlsSeen }),
    }),
    {
      name: "ajtyh:settings:v1",
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s) => ({
        masterVolume: s.masterVolume,
        musicVolume: s.musicVolume,
        sfxVolume: s.sfxVolume,
        muted: s.muted,
        quality: s.quality,
        motion: s.motion,
        cameraSensitivity: s.cameraSensitivity,
        invertY: s.invertY,
        joystickSide: s.joystickSide,
        subtitles: s.subtitles,
        language: s.language,
        showPerformance: s.showPerformance,
        controlsSeen: s.controlsSeen,
      }),
    },
  ),
);

/** Resolve the effective reduced-motion preference (setting + OS). */
export function prefersReducedMotion(motion: MotionSetting): boolean {
  if (motion === "reduced") return true;
  if (motion === "full") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
