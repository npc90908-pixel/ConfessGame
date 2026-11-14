// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { getWorld } from "@/game/engine/world";
import type { SceneId } from "@/types/game";

// jsdom never loads images, so hand every texture hook an inert texture.
vi.mock("@react-three/drei", () => import("../helpers/drei").then((m) => m.mockDrei()));

// --- browser shims the engine expects --------------------------------------
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  // Howler and the texture loaders are never exercised; keep them inert.
  vi.stubGlobal("AudioContext", class { state = "suspended"; resume() { return Promise.resolve(); } });
  if (!("ResizeObserver" in globalThis)) vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, media: "", onchange: null, dispatchEvent: () => false });
  }
  // Images never load in jsdom; Suspense fallbacks cover anything texture-bound.
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const msg = String(args[0] ?? "");
    if (msg.includes("Could not load") || msg.includes("THREE.WebGLRenderer")) return;
    throw new Error(`console.error during render: ${args.map(String).join(" ")}`);
  });
});

afterEach(() => {
  useProgressStore.setState({ sceneId: "strange-place" as SceneId });
});

const ENVIRONMENTS: Array<{ name: string; load: () => Promise<{ default: React.ComponentType }>; scene: SceneId; worldId: string }> = [
  { name: "SkyIsland", load: () => import("@/game/scenes/environments/SkyIsland"), scene: "strange-place", worldId: "sky-island" },
  { name: "MemoryGarden", load: () => import("@/game/scenes/environments/MemoryGarden"), scene: "memory-in-the-air", worldId: "memory-garden" },
  { name: "OceanWorld", load: () => import("@/game/scenes/environments/OceanWorld"), scene: "message-bottles", worldId: "ocean" },
  { name: "CastleWorld", load: () => import("@/game/scenes/environments/CastleWorld"), scene: "unspoken-words", worldId: "castle" },
  { name: "FinalGarden", load: () => import("@/game/scenes/environments/FinalGarden"), scene: "the-gift", worldId: "final-garden" },
];

describe.each(ENVIRONMENTS)("$name", ({ load, scene, worldId }) => {
  it("mounts, registers its world, survives a few frames and unmounts cleanly", async () => {
    useProgressStore.setState({ sceneId: scene });
    useUIStore.getState().setPhase("playing");
    const { default: Environment } = await load();

    const renderer = await ReactThreeTestRenderer.create(
      <React.Suspense fallback={null}>
        <Environment />
      </React.Suspense>,
    );
    await renderer.advanceFrames(5, 1 / 60);

    const world = getWorld();
    expect(world?.id).toBe(worldId);
    expect(typeof world?.getHeight(0, 0)).toBe("number");
    expect(renderer.scene.children.length).toBeGreaterThan(0);

    await renderer.unmount();
    expect(getWorld()).toBeNull();
  });
});
