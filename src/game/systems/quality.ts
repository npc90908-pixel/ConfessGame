"use client";

import { create } from "zustand";
import { QUALITY_PRESETS, guessQualityTier } from "@/lib/device";
import { useSettingsStore } from "@/store/settingsStore";
import type { QualityTier } from "@/types/game";

interface QualityState {
  /** Tier picked automatically from device heuristics + runtime monitoring. */
  autoTier: QualityTier;
  fps: number;
  setAutoTier: (tier: QualityTier) => void;
  setFps: (fps: number) => void;
  degrade: () => void;
  improve: () => void;
}

const ORDER: QualityTier[] = ["low", "medium", "high"];

export const useQualityStore = create<QualityState>()((set, get) => ({
  autoTier: typeof window === "undefined" ? "medium" : guessQualityTier(),
  fps: 60,
  setAutoTier: (autoTier) => set({ autoTier }),
  setFps: (fps) => set({ fps }),
  degrade: () => {
    const i = ORDER.indexOf(get().autoTier);
    if (i > 0) set({ autoTier: ORDER[i - 1] });
  },
  improve: () => {
    const i = ORDER.indexOf(get().autoTier);
    if (i < ORDER.length - 1 && i >= 0) set({ autoTier: ORDER[i + 1] });
  },
}));

/** Resolve the effective tier (settings override or auto) and its preset. */
export function useQuality() {
  const setting = useSettingsStore((s) => s.quality);
  const autoTier = useQualityStore((s) => s.autoTier);
  const tier: QualityTier = setting === "auto" ? autoTier : setting;
  return { tier, preset: QUALITY_PRESETS[tier], isAuto: setting === "auto" };
}

export function getQualityTier(): QualityTier {
  const setting = useSettingsStore.getState().quality;
  return setting === "auto" ? useQualityStore.getState().autoTier : setting;
}
