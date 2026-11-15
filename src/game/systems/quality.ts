"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { QUALITY_PRESETS, type QualityPreset, guessQualityTier } from "@/lib/device";
import { useSettingsStore, type ShadowSetting } from "@/store/settingsStore";
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

interface GraphicsOverrides {
  shadowQuality: ShadowSetting;
  particleDensity: number;
  resolutionScale: number;
}

const SHADOW_MAP_SIZES: Record<QualityTier, number> = { low: 512, medium: 1024, high: 2048 };
const presetCache = new Map<string, QualityPreset>();

/**
 * The tier preset with the player's graphics overrides applied. Cached per
 * combination so consumers can keep it in hook dependency lists.
 */
export function resolvePreset(tier: QualityTier, o: GraphicsOverrides): QualityPreset {
  const key = `${tier}|${o.shadowQuality}|${o.particleDensity}|${o.resolutionScale}`;
  let preset = presetCache.get(key);
  if (!preset) {
    const base = QUALITY_PRESETS[tier];
    const shadows = o.shadowQuality === "auto" ? base.shadows : o.shadowQuality !== "off";
    const shadowMapSize = o.shadowQuality === "auto" || o.shadowQuality === "off" ? base.shadowMapSize : SHADOW_MAP_SIZES[o.shadowQuality];
    const clampDpr = (v: number) => Math.min(3, Math.max(0.5, +(v * o.resolutionScale).toFixed(3)));
    preset = {
      ...base,
      shadows,
      shadowMapSize,
      dpr: [clampDpr(base.dpr[0]), clampDpr(base.dpr[1])],
      particleScale: +(base.particleScale * o.particleDensity).toFixed(3),
    };
    presetCache.set(key, preset);
  }
  return preset;
}

const selectOverrides = (s: { shadowQuality: ShadowSetting; particleDensity: number; resolutionScale: number }): GraphicsOverrides => ({
  shadowQuality: s.shadowQuality,
  particleDensity: s.particleDensity,
  resolutionScale: s.resolutionScale,
});

/** Resolve the effective tier (settings override or auto) and its preset. */
export function useQuality() {
  const setting = useSettingsStore((s) => s.quality);
  const overrides = useSettingsStore(useShallow(selectOverrides));
  const autoTier = useQualityStore((s) => s.autoTier);
  const tier: QualityTier = setting === "auto" ? autoTier : setting;
  return { tier, preset: resolvePreset(tier, overrides), isAuto: setting === "auto" };
}

export function getQualityTier(): QualityTier {
  const setting = useSettingsStore.getState().quality;
  return setting === "auto" ? useQualityStore.getState().autoTier : setting;
}

/** Non-hook variant for imperative code (frame loops, loaders). */
export function getQualityPreset(): QualityPreset {
  return resolvePreset(getQualityTier(), selectOverrides(useSettingsStore.getState()));
}
