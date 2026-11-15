// @vitest-environment jsdom
/**
 * Chapter 3 with the real controllers: walk down the pier, board the boat
 * through the proximity prompt and sail with held keys. Guards the
 * "W goes backwards" class of bugs by checking every input against the
 * direction the camera is actually looking.
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
import { input } from "@/game/engine/input";
import { getActiveInteractableId, triggerActiveInteraction } from "@/game/engine/interactions";
import { cameraBasis, type Basis } from "@/game/engine/movement";
import { runtime } from "@/game/engine/runtime";
import { CameraSystem } from "@/game/engine/systems/CameraSystem";
import { InteractionSystem } from "@/game/engine/systems/InteractionSystem";
import { PlayerSystem } from "@/game/engine/systems/PlayerSystem";
import { getWorld } from "@/game/engine/world";
import { OCEAN } from "@/game/scenes/landmarks";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { selectControlsLocked, useUIStore } from "@/store/uiStore";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = false;

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
let renderer: Renderer | null = null;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const FRAME = 1 / 30;
const basis: Basis = { fx: 0, fz: 0, rx: 0, rz: 0 };

const isIdle = () => {
  const ui = useUIStore.getState();
  return ui.phase === "playing" && !ui.overlay && !ui.cinematic && !ui.dialogue && !ui.transition.active && ui.veil === 0;
};

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

/** Hold keys for `n` frames and return the XZ displacement. */
async function hold(keys: string[], n: number) {
  const p = runtime.player.position;
  const x0 = p.x;
  const z0 = p.z;
  for (const k of keys) input.keys.add(k);
  try {
    await frames(n);
  } finally {
    for (const k of keys) input.keys.delete(k);
  }
  return { dx: p.x - x0, dz: p.z - z0 };
}

/** Components of a displacement along the camera's forward/right axes (at `yaw`). */
function relativeToCamera(d: { dx: number; dz: number }, yaw = runtime.camera.yaw) {
  cameraBasis(yaw, basis);
  return { forward: d.dx * basis.fx + d.dz * basis.fz, right: d.dx * basis.rx + d.dz * basis.rz };
}

async function walkTo(target: readonly [number, number, number], { reach = 1.0, seconds = 20 } = {}) {
  const p = runtime.player;
  let dist = Infinity;
  const steps = Math.ceil(seconds / FRAME);
  input.keys.add("KeyW");
  try {
    for (let i = 0; i < steps; i++) {
      if (selectControlsLocked(useUIStore.getState())) {
        await frames(1, 0.1);
        await wait(5);
        continue;
      }
      if (i % 15 === 0) await wait(0);
      const dx = target[0] - p.position.x;
      const dz = target[2] - p.position.z;
      dist = Math.hypot(dx, dz);
      if (dist <= reach) break;
      runtime.camera.yaw = Math.atan2(-dx, -dz);
      await frames(1);
    }
  } finally {
    input.keys.delete("KeyW");
  }
  await frames(8);
  return dist;
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
  progress.setScene("silent-ocean");
  progress.setCheckpoint("silent-ocean");
  useUIStore.getState().setActiveEnvironment("ocean", false);
  useUIStore.getState().setPhase("playing");
  const { default: OceanWorld } = await import("@/game/scenes/environments/OceanWorld");
  renderer = await ReactThreeTestRenderer.create(
    <React.Suspense fallback={null}>
      <OceanWorld />
      <PlayerSystem />
      <CameraSystem />
      <InteractionSystem />
    </React.Suspense>,
  );
  await frames(2);
  expect(getWorld()?.id).toBe("ocean");
  void game.enterScene("silent-ocean", { resume: true });
  await untilIdle();
});

afterAll(async () => {
  await renderer?.unmount();
});

describe("Chapter 3 — the pier and the boat", () => {
  it("walks down the pier towards the boat (W moves away from the camera)", async () => {
    const p = runtime.player;
    expect(p.mode).toBe("walk");
    const d = relativeToCamera(await hold(["KeyW"], 30));
    expect(d.forward).toBeGreaterThan(1.5);
    expect(Math.abs(d.right)).toBeLessThan(0.6);
    const left = await walkTo([OCEAN.pierEnd[0], 0, OCEAN.pierEnd[2] - 0.2], { reach: 0.7 });
    expect(left).toBeLessThanOrEqual(0.7);
  });

  it("boards through the proximity prompt and the camera sits behind the bow", async () => {
    await frames(2);
    expect(getActiveInteractableId()).toBe("boat");
    expect(triggerActiveInteraction()).toBe(true);
    await frames(2);
    const p = runtime.player;
    expect(p.mode).toBe("boat");
    expect(runtime.camera.mode).toBe("boat");
    // Let the rig settle, then check the camera is looking along the bow (≈ -z).
    await frames(45);
    cameraBasis(runtime.camera.yaw, basis);
    const bowX = Math.sin(p.boat.heading);
    const bowZ = Math.cos(p.boat.heading);
    expect(bowX * basis.fx + bowZ * basis.fz).toBeGreaterThan(0.7);
    expect(bowZ).toBeLessThan(-0.9); // moored facing the open sea
  });

  it("W sails forward (away from the camera and away from the pier)", async () => {
    const z0 = runtime.player.position.z;
    const d = relativeToCamera(await hold(["KeyW"], 90));
    expect(d.forward).toBeGreaterThan(4);
    expect(Math.abs(d.right)).toBeLessThan(d.forward * 0.25);
    expect(runtime.player.position.z).toBeLessThan(z0 - 3);
    await frames(90); // coast to a stop
  });

  it("S reverses towards the camera", async () => {
    await frames(60); // camera swings behind
    const d = relativeToCamera(await hold(["KeyS"], 75));
    expect(d.forward).toBeLessThan(-1);
    await frames(90);
  });

  it("A steers to port and D to starboard while moving", async () => {
    // The camera swings behind the boat while it turns, so judge the arc
    // against the view the player had when they pressed the key.
    await frames(60);
    const h0 = runtime.player.boat.heading;
    const yaw0 = runtime.camera.yaw;
    const left = relativeToCamera(await hold(["KeyW", "KeyA"], 60), yaw0);
    expect(runtime.player.boat.heading).toBeGreaterThan(h0 + 0.2);
    expect(left.right).toBeLessThan(-0.5);
    expect(left.forward).toBeGreaterThan(0.5);
    await frames(120); // stop and let the camera settle behind the new heading
    const h1 = runtime.player.boat.heading;
    const yaw1 = runtime.camera.yaw;
    const right = relativeToCamera(await hold(["KeyW", "KeyD"], 60), yaw1);
    expect(runtime.player.boat.heading).toBeLessThan(h1 - 0.2);
    expect(right.right).toBeGreaterThan(0.5);
    expect(right.forward).toBeGreaterThan(0.5);
    await frames(120);
  });

  it("the character faces the bow and the camera follows the heading", async () => {
    const p = runtime.player;
    await hold(["KeyW"], 60);
    await frames(60);
    expect(Math.abs(Math.atan2(Math.sin(p.yaw - p.boat.heading), Math.cos(p.yaw - p.boat.heading)))).toBeLessThan(0.01);
    const behind = p.boat.heading + Math.PI;
    const diff = Math.atan2(Math.sin(runtime.camera.yaw - behind), Math.cos(runtime.camera.yaw - behind));
    expect(Math.abs(diff)).toBeLessThan(0.35);
  });

  it("reaches the distant light with W alone once pointed at it", async () => {
    const p = runtime.player;
    const target = OCEAN.marker;
    // Steer until the bow points at the light, then hold W.
    for (let i = 0; i < 600; i++) {
      const dx = target[0] - p.position.x;
      const dz = target[2] - p.position.z;
      if (Math.hypot(dx, dz) < 6) break;
      const want = Math.atan2(dx, dz);
      const err = Math.atan2(Math.sin(want - p.boat.heading), Math.cos(want - p.boat.heading));
      input.keys.add("KeyW");
      if (err > 0.08) input.keys.add("KeyA");
      else input.keys.delete("KeyA");
      if (err < -0.08) input.keys.add("KeyD");
      else input.keys.delete("KeyD");
      await frames(1);
      if (i % 20 === 0) await wait(0);
    }
    input.keys.clear();
    await frames(30);
    expect(Math.hypot(target[0] - p.position.x, target[2] - p.position.z)).toBeLessThan(8);
  });
});
