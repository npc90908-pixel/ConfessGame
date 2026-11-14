// @vitest-environment jsdom
/**
 * Plays every chapter inside its real 3D environment.
 *
 * The environments are mounted with the React Three Fiber test renderer
 * (no WebGL needed), frames are pumped so `useFrame` logic runs, and the
 * player is teleported / made to interact exactly like a human would:
 * walking up to markers, pressing "interact" on envelopes, flowers, bottles,
 * keys, pedestals, the boat, the shrine, the heart and the gift. Scripts,
 * cinematics and overlays run for real (fast-forwarded) through GameManager.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import gsap from "gsap";
import ReactThreeTestRenderer from "@react-three/test-renderer";

vi.mock("@/game/systems/audio/AudioManager", () => {
  const noop = () => undefined;
  return { audio: new Proxy({}, { get: () => noop }) };
});
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, sleep: (ms: number) => actual.sleep(Math.min(ms, 40)) };
});
vi.mock("@react-three/drei", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@react-three/drei")>();
  const { Texture } = await import("three");
  const cache = new Map<string, InstanceType<typeof Texture>>();
  const fake = (url: string) => {
    let t = cache.get(url);
    if (!t) {
      t = new Texture();
      cache.set(url, t);
    }
    return t;
  };
  const useTexture = Object.assign(
    (input: string | string[] | Record<string, string>) => {
      if (typeof input === "string") return fake(input);
      if (Array.isArray(input)) return input.map(fake);
      return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, fake(v)]));
    },
    { preload: () => undefined, clear: () => undefined },
  );
  return { ...actual, useTexture };
});

import { game } from "@/game/engine/GameManager";
import { fx } from "@/game/engine/fx";
import { triggerInteraction } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { getWorld } from "@/game/engine/world";
import { CASTLE, FINAL, GARDEN, OCEAN, SKY_ISLAND } from "@/game/scenes/landmarks";
import { BOTTLE_IDS, FLOWER_IDS, KEY_IDS, LIGHT_IDS, MEMORY_IDS } from "@/game/systems/items";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import type { EnvironmentId, SceneId } from "@/types/game";

// Store subscriptions update the environments outside of act(); that is exactly how the game runs, so silence the warning.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

let renderer: Renderer | null = null;
let pump: ReturnType<typeof setInterval> | null = null;
let pumping = false;
const unsubscribe: Array<() => void> = [];

/* ----------------------------------------------------------------------- */
/*  Helpers                                                                */
/* ----------------------------------------------------------------------- */

const isIdle = () => {
  const ui = useUIStore.getState();
  return ui.phase === "playing" && !ui.overlay && !ui.cinematic && !ui.dialogue && !ui.transition.active && ui.veil === 0;
};

async function waitIdle(settle = 200, timeout = 15000) {
  const start = Date.now();
  let idleSince: number | null = null;
  while (Date.now() - start < timeout) {
    if (isIdle()) {
      idleSince ??= Date.now();
      if (Date.now() - idleSince >= settle) return;
    } else idleSince = null;
    await wait(20);
  }
  throw new Error(`never idle in ${useProgressStore.getState().sceneId}: ${JSON.stringify({ ...useUIStore.getState(), dialogue: undefined, toasts: undefined })}`);
}

async function waitForScene(id: SceneId, timeout = 20000) {
  const start = Date.now();
  while (useProgressStore.getState().sceneId !== id) {
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for ${id}; still at ${useProgressStore.getState().sceneId}`);
    await wait(20);
  }
}

async function until(pred: () => boolean, what: string, timeout = 15000) {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeout) throw new Error(`timed out: ${what}`);
    await wait(20);
  }
}

const teleport = (p: readonly [number, number, number]) => {
  const w = getWorld();
  runtime.player.position.set(p[0], w ? w.getHeight(p[0], p[2]) : p[1], p[2]);
};

/** Press "interact" on something the way the prompt button does (player already next to it). */
const interact = (id: string) => triggerInteraction(id, 1e6);

async function interactWhenReady(id: string) {
  await until(() => interact(id), `interactable "${id}" to accept the interaction`);
}

const objective = (id: string) => useProgressStore.getState().objectiveProgress[id] ?? 0;

async function mountEnvironment(env: EnvironmentId, load: () => Promise<{ default: React.ComponentType }>, firstScene: SceneId) {
  const progress = useProgressStore.getState();
  progress.setScene(firstScene);
  progress.setCheckpoint(firstScene);
  useUIStore.getState().setActiveEnvironment(env, false);
  useUIStore.getState().setPhase("playing");
  const { default: Environment } = await load();
  renderer = await ReactThreeTestRenderer.create(
    <React.Suspense fallback={null}>
      <Environment />
    </React.Suspense>,
  );
  await renderer.advanceFrames(2, 1 / 60);
  expect(getWorld()?.id).toBe(env);
  void game.enterScene(firstScene, { resume: true });
  await waitForScene(firstScene);
  await waitIdle();
}

async function unmountEnvironment() {
  if (renderer) await renderer.unmount();
  renderer = null;
  expect(getWorld()).toBeNull();
}

/* ----------------------------------------------------------------------- */
/*  Autopilot: dismiss dialogue, skip cinematics, close overlays            */
/* ----------------------------------------------------------------------- */

beforeAll(() => {
  const error = console.error.bind(console);
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    if (String(args[0]).includes("not configured to support act")) return;
    error(...args);
  });
  gsap.ticker.lagSmoothing(0);
  gsap.globalTimeline.timeScale(60);
  useSettingsStore.getState().setControlsSeen(true);
  useProgressStore.getState().startNewJourney();
  game.boot();
  useUIStore.getState().setPhase("playing");

  unsubscribe.push(
    useUIStore.subscribe((s) => {
      if (s.dialogue) setTimeout(() => useUIStore.getState().advanceDialogue(), 15);
      if (s.cinematic && s.cinematicSkippable) setTimeout(() => game.skipCinematic(), 30);
      const overlay = s.overlay;
      if (!overlay) return;
      setTimeout(() => {
        if (useUIStore.getState().overlay !== overlay) return;
        switch (overlay.type) {
          case "puzzle":
            useProgressStore.getState().setPuzzleState("solved");
            useUIStore.getState().closeOverlay();
            break;
          case "proposal":
            void game.answer("yes");
            break;
          case "ending":
            break;
          default:
            useUIStore.getState().closeOverlay();
        }
      }, 20);
    }),
  );

  // Frame pump: 10 simulated fps worth of time per real tick so animations finish quickly.
  pump = setInterval(() => {
    if (!renderer || pumping) return;
    pumping = true;
    void renderer
      .advanceFrames(1, 0.1)
      .catch(() => undefined)
      .finally(() => {
        pumping = false;
      });
  }, 25);
});

afterAll(() => {
  if (pump) clearInterval(pump);
  unsubscribe.forEach((u) => u());
});

afterEach(async () => {
  await unmountEnvironment();
});

/* ----------------------------------------------------------------------- */
/*  Chapters                                                               */
/* ----------------------------------------------------------------------- */

describe("Chapter 1 — Sky Island", () => {
  it("explore → letter → lights → portal", async () => {
    await mountEnvironment("sky-island", () => import("@/game/scenes/environments/SkyIsland"), "strange-place");

    // 02 walk to the glowing marker
    teleport(SKY_ISLAND.marker);
    await waitForScene("first-message");
    expect(objective("explore-island")).toBe(1);

    // 03 the envelope falls, then we open it
    await waitIdle();
    teleport(SKY_ISLAND.envelopeLanding);
    await interactWhenReady("first-envelope");
    await waitForScene("follow-the-light");
    expect(useProgressStore.getState().inventory).toContain("letter-first");

    // 04 three lights
    await waitIdle();
    for (const [i, id] of LIGHT_IDS.entries()) {
      teleport(SKY_ISLAND.lights[i]);
      await interactWhenReady(id);
    }
    await waitForScene("first-portal");
    expect(objective("collect-lights")).toBe(3);

    // 05 the portal opens during the cinematic, then we step in
    await waitIdle();
    await until(() => fx.portalPower >= 0.5, "portal to power up");
    teleport(SKY_ISLAND.portal);
    await interactWhenReady("portal");
    await waitForScene("blooming-garden");
    expect(useProgressStore.getState().completedScenes).toEqual(expect.arrayContaining(["strange-place", "first-message", "follow-the-light", "first-portal"]));
  }, 60000);
});

describe("Chapter 2 — Memory Garden", () => {
  it("pavilion → flowers → memories → offering → bloom", async () => {
    await mountEnvironment("memory-garden", () => import("@/game/scenes/environments/MemoryGarden"), "blooming-garden");

    teleport(GARDEN.pavilion);
    await waitForScene("little-things");

    await waitIdle();
    for (const [i, id] of FLOWER_IDS.entries()) {
      teleport(GARDEN.flowers[i]);
      await interactWhenReady(id);
    }
    await waitForScene("memory-in-the-air");
    expect(objective("collect-flowers")).toBe(5);

    await waitIdle();
    for (const id of MEMORY_IDS) {
      teleport([0, 0, 0]);
      await interactWhenReady(id);
      await waitIdle();
    }
    await waitForScene("memory-tree");
    expect(useProgressStore.getState().viewedMemories).toHaveLength(5);

    await waitIdle();
    teleport(GARDEN.treeOffer);
    await interactWhenReady("memory-tree-offer");
    await waitForScene("beautiful-moment");

    // 10 is a pure cinematic that completes itself and hands over to chapter 3
    await waitForScene("silent-ocean", 30000);
    expect(fx.gardenBloom).toBe(1);
  }, 90000);
});

describe("Chapter 3 — Silent Ocean", () => {
  it("board → sail → bottles → stars → sunrise", async () => {
    await mountEnvironment("ocean", () => import("@/game/scenes/environments/OceanWorld"), "silent-ocean");

    teleport(OCEAN.boatMoor);
    await interactWhenReady("boat");
    expect(runtime.player.mode).toBe("boat");
    expect(runtime.camera.mode).toBe("boat");
    await waitForScene("sail-with-me");

    await waitIdle();
    runtime.player.position.set(OCEAN.marker[0], 0.5, OCEAN.marker[2]);
    await waitForScene("message-bottles");

    await waitIdle();
    for (const [i, id] of BOTTLE_IDS.entries()) {
      runtime.player.position.set(OCEAN.bottles[i][0], 0.5, OCEAN.bottles[i][2]);
      await interactWhenReady(id);
      await waitIdle();
    }
    await waitForScene("star-puzzle");
    expect(objective("collect-bottles")).toBe(3);

    await waitIdle();
    runtime.player.position.set(OCEAN.shrine[0], 0.5, OCEAN.shrine[2] + 10);
    await interactWhenReady("star-shrine");
    await waitForScene("beyond-horizon");
    expect(useProgressStore.getState().puzzleState).toBe("solved");

    await waitForScene("forgotten-castle", 30000);
  }, 90000);
});

describe("Chapter 4 — Forgotten Castle", () => {
  it("gate → keys → fragments → heart → letter", async () => {
    await mountEnvironment("castle", () => import("@/game/scenes/environments/CastleWorld"), "forgotten-castle");

    teleport(CASTLE.gate);
    await waitForScene("three-keys");

    await waitIdle();
    for (const [i, id] of KEY_IDS.entries()) {
      teleport(CASTLE.keys[i]);
      await interactWhenReady(id);
    }
    await waitForScene("unspoken-words");
    expect(objective("collect-keys")).toBe(3);

    await waitIdle();
    await until(() => fx.castleGate >= 1, "gate to open");
    for (let i = 0; i < 3; i++) {
      teleport(CASTLE.pedestals[i]);
      await interactWhenReady(`pedestal-${i}`);
      await waitIdle();
    }
    await waitForScene("heart-chamber");
    expect(useProgressStore.getState().unlockedFragments).toHaveLength(3);

    await waitIdle();
    await until(() => fx.castleInnerDoor >= 1, "inner door to open");
    teleport(CASTLE.heartRoom);
    await waitForScene("letter-from-me");

    await waitForScene("final-path", 30000);
    expect(useProgressStore.getState().inventory).toContain("letter-from-me");
  }, 90000);
});

describe("Chapter 5 — Final Garden", () => {
  it("path → summary → gift → question → ending", async () => {
    await mountEnvironment("final-garden", () => import("@/game/scenes/environments/FinalGarden"), "final-path");

    for (const [i, w] of FINAL.waypoints.entries()) {
      teleport(w);
      await until(() => objective("follow-path") >= i + 1, `waypoint ${i + 1}`);
    }
    await waitForScene("everything-we-found");
    await waitForScene("the-gift", 30000);

    await waitIdle();
    teleport(FINAL.gift);
    await interactWhenReady("gift-box");
    await waitForScene("the-question");
    expect(useProgressStore.getState().inventory).toContain("gift-heart");
    expect(fx.giftOpen).toBeGreaterThan(0.9);

    await waitForScene("new-beginning", 30000);
    await until(() => useUIStore.getState().overlay?.type === "ending", "ending screen");
    expect(useProgressStore.getState().answer).toBe("yes");
    expect(fx.celebration).toBeGreaterThan(0);
  }, 90000);
});
