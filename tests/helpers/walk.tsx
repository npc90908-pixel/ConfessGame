/**
 * Shared "play it on foot" harness: mounts one environment with the real
 * player/camera/interaction systems under @react-three/test-renderer and
 * drives the controller with held keys, exactly like a human at the keyboard.
 *
 * Tests that use it must set `IS_REACT_ACT_ENVIRONMENT = false`, mock the
 * audio manager and drei (see tests/smoke/navigation.test.tsx).
 */
import React from "react";
import gsap from "gsap";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { expect, vi } from "vitest";
import { game } from "@/game/engine/GameManager";
import { input } from "@/game/engine/input";
import { getActiveInteractableId, triggerActiveInteraction } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { CameraSystem } from "@/game/engine/systems/CameraSystem";
import { InteractionSystem } from "@/game/engine/systems/InteractionSystem";
import { PlayerSystem } from "@/game/engine/systems/PlayerSystem";
import { getWorld } from "@/game/engine/world";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { selectControlsLocked, useUIStore } from "@/store/uiStore";
import type { EnvironmentId, SceneId } from "@/types/game";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
let renderer: Renderer | null = null;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const FRAME = 1 / 30;

export const isIdle = () => {
  const ui = useUIStore.getState();
  return ui.phase === "playing" && !ui.overlay && !ui.cinematic && !ui.dialogue && !ui.transition.active && ui.veil === 0;
};

/** Advance simulated frames (the only clock the game sees). */
export async function frames(n: number, dt = FRAME) {
  for (let i = 0; i < n; i++) await renderer!.advanceFrames(1, dt);
}

export async function untilIdle(timeoutMs = 15000) {
  const start = Date.now();
  while (!isIdle()) {
    await frames(1, 0.1);
    await wait(5);
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for the game to be idle");
  }
  await frames(6, 0.1);
}

export async function until(pred: () => boolean, what: string, timeoutMs = 15000) {
  const start = Date.now();
  while (!pred()) {
    await frames(1, 0.1);
    await wait(5);
    if (Date.now() - start > timeoutMs) throw new Error(`timed out: ${what}`);
  }
}

export async function waitForScene(id: SceneId, timeoutMs = 20000) {
  const start = Date.now();
  while (useProgressStore.getState().sceneId !== id) {
    await frames(1, 0.1);
    await wait(5);
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for scene ${id} (now ${useProgressStore.getState().sceneId})`);
  }
}

/**
 * Hold W while pointing the camera at the target. When the controller stops
 * making progress it side-steps for a moment (alternating sides). Resolves
 * with the remaining distance once within `reach` or when time runs out.
 * `onFrame` lets a test sample the player state along the way.
 */
export async function walkTo(target: readonly [number, number, number], { reach = 1.2, seconds = 40, onFrame }: { reach?: number; seconds?: number; onFrame?: () => void } = {}) {
  const p = runtime.player;
  let dist = Infinity;
  let best = Infinity;
  let stalled = 0;
  let detours = 0;
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
      if (dist < best - 0.05) {
        best = dist;
        stalled = 0;
      } else if (++stalled > 30) {
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
      onFrame?.();
    }
  } finally {
    input.keys.delete("KeyW");
    input.keys.delete("KeyA");
    input.keys.delete("KeyD");
  }
  await frames(8);
  return dist;
}

/** Press "interact" on the proximity prompt (never a forced trigger). */
export async function pressInteract(expectedId: string) {
  await frames(2);
  expect(getActiveInteractableId(), `prompt should offer ${expectedId}`).toBe(expectedId);
  expect(triggerActiveInteraction()).toBe(true);
}

/** Boot the game headless, mount `Environment` and enter `scene` as a resume. */
export async function mountOnFoot(environment: EnvironmentId, scene: SceneId, Environment: React.ComponentType) {
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
  progress.setScene(scene);
  progress.setCheckpoint(scene);
  useUIStore.getState().setActiveEnvironment(environment, false);
  useUIStore.getState().setPhase("playing");
  renderer = await ReactThreeTestRenderer.create(
    <React.Suspense fallback={null}>
      <Environment />
      <PlayerSystem />
      <CameraSystem />
      <InteractionSystem />
    </React.Suspense>,
  );
  await frames(2);
  expect(getWorld()?.id).toBe(environment);
  void game.enterScene(scene, { resume: true });
  await untilIdle();
}

export async function unmountOnFoot() {
  await renderer?.unmount();
  renderer = null;
}
