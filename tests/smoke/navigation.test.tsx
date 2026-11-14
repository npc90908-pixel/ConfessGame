// @vitest-environment jsdom
/**
 * Plays Chapter 4 by actually WALKING.
 *
 * The teleport-based gameplay suite cannot catch "the player is boxed in at
 * spawn" or "the key sits inside the fountain collider" — this one drives the
 * real PlayerSystem with held keys and camera-relative input, exactly like a
 * human holding W, and only interacts through the proximity prompt.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
vi.mock("@react-three/drei", () => import("../helpers/drei").then((m) => m.mockDrei()));

import { game } from "@/game/engine/GameManager";
import { fx } from "@/game/engine/fx";
import { input } from "@/game/engine/input";
import { getActiveInteractableId, triggerActiveInteraction } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { CameraSystem } from "@/game/engine/systems/CameraSystem";
import { InteractionSystem } from "@/game/engine/systems/InteractionSystem";
import { PlayerSystem } from "@/game/engine/systems/PlayerSystem";
import { getWorld } from "@/game/engine/world";
import { CASTLE } from "@/game/scenes/landmarks";
import { KEY_IDS } from "@/game/systems/items";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { selectControlsLocked, useUIStore } from "@/store/uiStore";
import type { SceneId } from "@/types/game";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
let renderer: Renderer | null = null;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const FRAME = 1 / 30;

const isIdle = () => {
  const ui = useUIStore.getState();
  return ui.phase === "playing" && !ui.overlay && !ui.cinematic && !ui.dialogue && !ui.transition.active && ui.veil === 0;
};

/** Advance simulated frames (the only clock the game sees). */
async function frames(n: number, dt = FRAME) {
  for (let i = 0; i < n; i++) await renderer!.advanceFrames(1, dt);
}

async function untilIdle(timeoutMs = 15000) {
  const start = Date.now();
  while (!isIdle()) {
    await frames(1, 0.1);
    await wait(5);
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for the game to be idle");
  }
  await frames(6, 0.1);
}

async function until(pred: () => boolean, what: string, timeoutMs = 15000) {
  const start = Date.now();
  while (!pred()) {
    await frames(1, 0.1);
    await wait(5);
    if (Date.now() - start > timeoutMs) throw new Error(`timed out: ${what}`);
  }
}

async function waitForScene(id: SceneId, timeoutMs = 20000) {
  const start = Date.now();
  while (useProgressStore.getState().sceneId !== id) {
    await frames(1, 0.1);
    await wait(5);
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for scene ${id} (now ${useProgressStore.getState().sceneId})`);
  }
}

/**
 * Hold W while pointing the camera at the target — what a player does. When
 * the controller stops making progress (a lamp post, a hedge corner) it side-
 * steps for a moment, alternating sides, like anyone would. Resolves with the
 * remaining distance once within `reach` or when the time budget runs out.
 */
async function walkTo(target: readonly [number, number, number], { reach = 1.2, seconds = 40 } = {}) {
  const p = runtime.player;
  let dist = Infinity;
  let best = Infinity;
  let stalled = 0;
  let detours = 0;
  const steps = Math.ceil(seconds / FRAME);
  input.keys.add("KeyW");
  try {
    for (let i = 0; i < steps; i++) {
      // Dialogue / overlays lock the controls: let the autopilot (real timers) dismiss them.
      if (selectControlsLocked(useUIStore.getState())) {
        await frames(1, 0.1);
        await wait(5);
        continue;
      }
      if (i % 15 === 0) await wait(0); // keep timers alive during long walks
      const dx = target[0] - p.position.x;
      const dz = target[2] - p.position.z;
      dist = Math.hypot(dx, dz);
      if (dist <= reach) break;
      // forward = (-sin yaw, -cos yaw)  ⇒  yaw = atan2(-dx, -dz)
      runtime.camera.yaw = Math.atan2(-dx, -dz);
      if (dist < best - 0.05) {
        best = dist;
        stalled = 0;
      } else if (++stalled > 30) {
        // Side-step for a second (alternating sides), then try again.
        const key = detours++ % 2 === 0 ? "KeyA" : "KeyD";
        input.keys.add(key);
        input.keys.delete("KeyW");
        await frames(30);
        input.keys.delete(key);
        input.keys.add("KeyW");
        stalled = 0;
        best = Infinity;
        continue;
      }
      await frames(1);
    }
  } finally {
    input.keys.delete("KeyW");
    input.keys.delete("KeyA");
    input.keys.delete("KeyD");
  }
  await frames(8); // decelerate
  return dist;
}

/** Press "interact" on the proximity prompt (never a forced trigger). */
async function pressInteract(expectedId: string) {
  await frames(2);
  expect(getActiveInteractableId(), `prompt should offer ${expectedId}`).toBe(expectedId);
  expect(triggerActiveInteraction()).toBe(true);
}

beforeAll(async () => {
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
  useUIStore.subscribe((s) => {
    if (s.dialogue) setTimeout(() => useUIStore.getState().advanceDialogue(), 15);
    if (s.cinematic && s.cinematicSkippable) setTimeout(() => game.skipCinematic(), 30);
    if (s.overlay) setTimeout(() => useUIStore.getState().closeOverlay(), 20);
  });

  const progress = useProgressStore.getState();
  progress.setScene("forgotten-castle");
  progress.setCheckpoint("forgotten-castle");
  useUIStore.getState().setActiveEnvironment("castle", false);
  useUIStore.getState().setPhase("playing");
  const { default: CastleWorld } = await import("@/game/scenes/environments/CastleWorld");
  renderer = await ReactThreeTestRenderer.create(
    <React.Suspense fallback={null}>
      <CastleWorld />
      <PlayerSystem />
      <CameraSystem />
      <InteractionSystem />
    </React.Suspense>,
  );
  await frames(2);
  expect(getWorld()?.id).toBe("castle");
  void game.enterScene("forgotten-castle", { resume: true });
  await untilIdle();
});

afterAll(async () => {
  await renderer?.unmount();
});

describe("Chapter 4 on foot", () => {
  it("spawns facing the castle and can walk straight ahead", async () => {
    const p = runtime.player;
    expect(p.mode).toBe("walk");
    expect(runtime.camera.mode).toBe("follow");
    const z0 = p.position.z;
    input.keys.add("KeyW");
    await frames(60); // 2 s
    input.keys.delete("KeyW");
    // Forward is -z here: two seconds of walking must cover several metres.
    expect(z0 - p.position.z).toBeGreaterThan(5);
    expect(Math.abs(p.position.x)).toBeLessThan(1);
  });

  it("strafes right with D (no inverted axes)", async () => {
    const p = runtime.player;
    const x0 = p.position.x;
    input.keys.add("KeyD");
    await frames(30);
    input.keys.delete("KeyD");
    expect(p.position.x - x0).toBeGreaterThan(1.5);
    await walkTo([0, 0, p.position.z - 2]);
  });

  it("walks over the bridge, through the gatehouse and reaches the sealed gate", async () => {
    const left = await walkTo(CASTLE.gate, { reach: 1.5, seconds: 60 });
    expect(left).toBeLessThanOrEqual(1.5);
    await waitForScene("three-keys");
    await untilIdle();
  });

  it("collects all three keys using only the proximity prompt", async () => {
    // Routes avoid cutting through hedges — the kind of path a player takes.
    const routes: Array<Array<readonly [number, number, number]>> = [
      [[-18, 0, 18], CASTLE.keys[0]],
      [[-18, 0, 18], CASTLE.keys[1]],
      [[20, 0, 0], CASTLE.keys[2]],
    ];
    for (const [i, id] of KEY_IDS.entries()) {
      for (const wp of routes[i]) {
        const left = await walkTo(wp, { reach: 1.4, seconds: 50 });
        expect(left, `reach waypoint ${wp} for ${id}`).toBeLessThanOrEqual(1.4);
      }
      await pressInteract(id);
      await untilIdle();
      expect(useProgressStore.getState().inventory).toContain(id);
    }
    await waitForScene("unspoken-words");
    await untilIdle();
    await until(() => fx.castleGate >= 1, "the sealed gate to open");
  });

  it("enters the keep and unlocks the three fragments", async () => {
    for (const wp of [
      [0, 0, -18],
      [0, 0, -30],
    ] as const) {
      expect(await walkTo(wp, { reach: 1.4, seconds: 50 })).toBeLessThanOrEqual(1.4);
    }
    for (let i = 0; i < 3; i++) {
      const ped = CASTLE.pedestals[i];
      const stand: [number, number, number] = [ped[0], 0, ped[2] + 2.2];
      expect(await walkTo(stand, { reach: 0.9, seconds: 30 })).toBeLessThanOrEqual(0.9);
      await pressInteract(`pedestal-${i}`);
      await untilIdle();
    }
    expect(useProgressStore.getState().unlockedFragments).toHaveLength(3);
    await waitForScene("heart-chamber");
    await untilIdle();
    await until(() => fx.castleInnerDoor >= 1, "the inner door to open");
  });

  it("walks through the inner door into the heart room and triggers the letter", async () => {
    for (const wp of [
      [0, 0, CASTLE.innerDoor[2] + 2],
      [0, 0, CASTLE.heartRoom[2] + CASTLE.heartRoomRadius - 1],
      [0, 0, CASTLE.heartRoom[2] + 4],
    ] as const) {
      expect(await walkTo(wp, { reach: 1.4, seconds: 40 })).toBeLessThanOrEqual(1.4);
    }
    await waitForScene("letter-from-me");
    await waitForScene("final-path", 40000);
    expect(useProgressStore.getState().inventory).toContain("letter-from-me");
  }, 60000);
});
