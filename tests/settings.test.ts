// @vitest-environment jsdom
/**
 * Settings persistence and the graphics overrides they drive.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { SETTINGS_DEFAULTS, getAnimationIntensity, useSettingsStore } from "@/store/settingsStore";
import { resolvePreset } from "@/game/systems/quality";
import { QUALITY_PRESETS } from "@/lib/device";

const KEY = "ajtyh:settings:v1";

beforeEach(() => {
  window.localStorage.clear();
  useSettingsStore.getState().resetToDefaults();
});

describe("settings store", () => {
  it("writes every option to localStorage and restores it on rehydrate", async () => {
    const s = useSettingsStore.getState();
    s.setMasterVolume(0.33);
    s.setAmbientVolume(0.21);
    s.setShadowQuality("low");
    s.setParticleDensity(0.5);
    s.setPostProcessing(false);
    s.setResolutionScale(0.75);
    s.setMovementSensitivity(1.25);
    s.setControlHints(false);
    s.setShowHud(false);
    s.setTextSize("large");
    s.setAnimationIntensity(0.4);
    s.setSubtitles(false);

    const raw = window.localStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!) as { state: Record<string, unknown>; version: number };
    expect(saved.version).toBe(2);
    expect(saved.state.ambientVolume).toBe(0.21);
    expect(saved.state.textSize).toBe("large");
    expect(saved.state).not.toHaveProperty("setMasterVolume");

    // Simulate a reload: wipe memory state (which also overwrites storage),
    // put the earlier snapshot back as the "previous session", then hydrate.
    useSettingsStore.setState({ ...SETTINGS_DEFAULTS });
    expect(useSettingsStore.getState().ambientVolume).toBe(SETTINGS_DEFAULTS.ambientVolume);
    window.localStorage.setItem(KEY, raw!);
    await useSettingsStore.persist.rehydrate();
    const r = useSettingsStore.getState();
    expect(r.masterVolume).toBe(0.33);
    expect(r.ambientVolume).toBe(0.21);
    expect(r.shadowQuality).toBe("low");
    expect(r.particleDensity).toBe(0.5);
    expect(r.postProcessing).toBe(false);
    expect(r.resolutionScale).toBe(0.75);
    expect(r.movementSensitivity).toBe(1.25);
    expect(r.controlHints).toBe(false);
    expect(r.showHud).toBe(false);
    expect(r.textSize).toBe("large");
    expect(r.animationIntensity).toBe(0.4);
    expect(r.subtitles).toBe(false);
  });

  it("merges a legacy v1 save (missing keys, odd values) onto the defaults", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ state: { masterVolume: 7, musicVolume: 0.2, quality: "high", language: "en", controlsSeen: true, cameraSensitivity: "fast" }, version: 1 }),
    );
    await useSettingsStore.persist.rehydrate();
    const s = useSettingsStore.getState();
    expect(s.masterVolume).toBe(1); // clamped
    expect(s.musicVolume).toBe(0.2);
    expect(s.quality).toBe("high");
    expect(s.language).toBe("en");
    expect(s.controlsSeen).toBe(true);
    expect(s.cameraSensitivity).toBe(1); // wrong type → default
    expect(s.ambientVolume).toBe(SETTINGS_DEFAULTS.ambientVolume);
    expect(s.shadowQuality).toBe("auto");
    expect(s.textSize).toBe("medium");
    expect(typeof s.setAmbientVolume).toBe("function");
  });

  it("clamps numeric setters", () => {
    const s = useSettingsStore.getState();
    s.setParticleDensity(99);
    s.setResolutionScale(0);
    s.setAnimationIntensity(-1);
    s.setMovementSensitivity(Number.NaN);
    const r = useSettingsStore.getState();
    expect(r.particleDensity).toBe(1.5);
    expect(r.resolutionScale).toBe(0.5);
    expect(r.animationIntensity).toBe(0.25);
    expect(r.movementSensitivity).toBe(0.5);
  });

  it("restoreDefaults keeps the tutorial flag", () => {
    const s = useSettingsStore.getState();
    s.setControlsSeen(true);
    s.setMuted(true);
    s.resetToDefaults();
    expect(useSettingsStore.getState().muted).toBe(false);
    expect(useSettingsStore.getState().controlsSeen).toBe(true);
  });

  it("caps animation intensity under reduced motion", () => {
    const s = useSettingsStore.getState();
    s.setAnimationIntensity(1);
    s.setMotion("reduced");
    expect(getAnimationIntensity()).toBeLessThanOrEqual(0.3);
    s.setMotion("full");
    expect(getAnimationIntensity()).toBe(1);
  });
});

describe("graphics overrides", () => {
  it("derives the effective preset from the tier plus the player's overrides", () => {
    const base = QUALITY_PRESETS.high;
    const auto = resolvePreset("high", { shadowQuality: "auto", particleDensity: 1, resolutionScale: 1 });
    expect(auto).toEqual(base);
    const custom = resolvePreset("high", { shadowQuality: "low", particleDensity: 0.5, resolutionScale: 0.5 });
    expect(custom.shadows).toBe(true);
    expect(custom.shadowMapSize).toBe(512);
    expect(custom.particleScale).toBeCloseTo(0.5);
    expect(custom.dpr).toEqual([0.5, 1]);
    const off = resolvePreset("low", { shadowQuality: "off", particleDensity: 1.5, resolutionScale: 1.5 });
    expect(off.shadows).toBe(false);
    expect(off.particleScale).toBeCloseTo(0.35 * 1.5);
    expect(off.dpr[1]).toBe(1.5);
    const forced = resolvePreset("low", { shadowQuality: "high", particleDensity: 1, resolutionScale: 1 });
    expect(forced.shadows).toBe(true);
    expect(forced.shadowMapSize).toBe(2048);
  });

  it("returns a stable object for the same inputs", () => {
    const a = resolvePreset("medium", { shadowQuality: "auto", particleDensity: 1, resolutionScale: 1 });
    const b = resolvePreset("medium", { shadowQuality: "auto", particleDensity: 1, resolutionScale: 1 });
    expect(a).toBe(b);
  });
});
