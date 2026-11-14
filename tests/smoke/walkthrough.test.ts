// @vitest-environment jsdom
/**
 * Headless walkthrough of the whole journey.
 *
 * Drives the GameManager exactly the way the environments and the UI do —
 * objectives are advanced, overlays are closed, dialogue is dismissed,
 * cinematics play (fast-forwarded) — and asserts that all 25 scenes chain
 * from the first message to the ending screen, that chapter boundaries show
 * their cards and that resuming from a checkpoint works.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import gsap from "gsap";

vi.mock("@/game/systems/audio/AudioManager", () => {
  const noop = () => undefined;
  const audio = new Proxy({}, { get: () => noop });
  return { audio };
});

// Fades are real-time sleeps; shorten them so the run stays quick.
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return { ...actual, sleep: (ms: number) => actual.sleep(Math.min(ms, 40)) };
});

import { game } from "@/game/engine/GameManager";
import { BOTTLE_IDS, FLOWER_IDS, FRAGMENT_IDS, KEY_IDS, LIGHT_IDS, MEMORY_IDS } from "@/game/systems/items";
import { SCENES, SCENE_ORDER } from "@/game/scenes/registry";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import type { EnvironmentId, SceneId } from "@/types/game";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** What the player (via the environment) does to finish each objective. */
const OBJECTIVE_ACTIONS: Record<string, () => void> = {
  "explore-island": () => game.advanceObjective("explore-island"),
  "read-first-message": () => {
    game.collect("letter-first");
    game.advanceObjective("read-first-message");
  },
  "collect-lights": () => LIGHT_IDS.forEach((id) => game.collect(id) && game.advanceObjective("collect-lights")),
  "enter-portal": () => game.advanceObjective("enter-portal"),
  "reach-pavilion": () => game.advanceObjective("reach-pavilion"),
  "collect-flowers": () => FLOWER_IDS.forEach((id) => game.collect(id) && game.advanceObjective("collect-flowers")),
  "view-memories": () =>
    MEMORY_IDS.forEach((id) => {
      useProgressStore.getState().markMemoryViewed(id);
      game.collect(id);
      game.advanceObjective("view-memories");
    }),
  "offer-flowers": () => game.advanceObjective("offer-flowers"),
  "board-boat": () => game.advanceObjective("board-boat"),
  "sail-to-light": () => game.advanceObjective("sail-to-light"),
  "collect-bottles": () => BOTTLE_IDS.forEach((id) => game.collect(id) && game.advanceObjective("collect-bottles")),
  "solve-stars": () => {
    useProgressStore.getState().setPuzzleState("solved");
    game.advanceObjective("solve-stars");
  },
  "reach-gate": () => game.advanceObjective("reach-gate"),
  "collect-keys": () => KEY_IDS.forEach((id) => game.collect(id) && game.advanceObjective("collect-keys")),
  "unlock-fragments": () => FRAGMENT_IDS.forEach((id) => game.collect(id) && game.advanceObjective("unlock-fragments")),
  "reach-heart": () => game.advanceObjective("reach-heart"),
  "follow-path": () => {
    for (let i = 0; i < 3; i++) game.advanceObjective("follow-path");
  },
  "open-gift": () => {
    game.collect("gift-heart");
    game.advanceObjective("open-gift");
  },
};

let autoAnswer = true;
const seenOverlays = new Set<string>();
const seenScenes: SceneId[] = [];
const environmentsMounted: EnvironmentId[] = [];
let unsubscribe: (() => void)[] = [];

function autopilot() {
  // The environment "mounts" as soon as the router asks for it.
  let lastEnv: string | null = null;
  unsubscribe.push(
    useUIStore.subscribe((s) => {
      const key = `${s.activeEnvironment}-${s.environmentKey}`;
      if (s.activeEnvironment && key !== lastEnv) {
        lastEnv = key;
        environmentsMounted.push(s.activeEnvironment);
        setTimeout(() => game.notifyEnvironmentReady(s.activeEnvironment!), 5);
      }
    }),
  );
  // The player reads and dismisses everything that pops up.
  unsubscribe.push(
    useUIStore.subscribe((s) => {
      if (s.dialogue) setTimeout(() => useUIStore.getState().advanceDialogue(), 15);
      if (s.cinematic) setTimeout(() => game.skipCinematic(), 30);
      const overlay = s.overlay;
      if (!overlay) return;
      seenOverlays.add(overlay.type);
      setTimeout(() => {
        if (useUIStore.getState().overlay !== overlay) return;
        switch (overlay.type) {
          case "puzzle":
            useProgressStore.getState().setPuzzleState("solved");
            useUIStore.getState().closeOverlay();
            break;
          case "proposal":
            if (autoAnswer) void game.answer("yes");
            break;
          case "ending":
            break;
          default:
            useUIStore.getState().closeOverlay();
        }
      }, 20);
    }),
  );
  unsubscribe.push(
    useProgressStore.subscribe((s) => {
      if (seenScenes.at(-1) !== s.sceneId) seenScenes.push(s.sceneId);
    }),
  );
}

const isIdle = () => {
  const ui = useUIStore.getState();
  return ui.phase === "playing" && !ui.overlay && !ui.cinematic && !ui.dialogue && !ui.transition.active && ui.veil === 0;
};

/** Resolve once the game has been idle for `settle` ms (player reaction time). */
async function waitIdle(settle = 250, timeout = 15000) {
  const start = Date.now();
  let idleSince: number | null = null;
  while (Date.now() - start < timeout) {
    if (isIdle()) {
      idleSince ??= Date.now();
      if (Date.now() - idleSince >= settle) return;
    } else idleSince = null;
    await wait(20);
  }
  throw new Error(`game never became idle (scene ${useProgressStore.getState().sceneId}, ui ${JSON.stringify({ ...useUIStore.getState(), dialogue: undefined })})`);
}

async function waitForScene(id: SceneId, timeout = 20000) {
  const start = Date.now();
  while (useProgressStore.getState().sceneId !== id) {
    if (Date.now() - start > timeout) throw new Error(`timed out waiting for scene ${id}; still at ${useProgressStore.getState().sceneId}`);
    await wait(20);
  }
}

beforeAll(() => {
  gsap.ticker.lagSmoothing(0);
  gsap.globalTimeline.timeScale(50);
  useSettingsStore.getState().setControlsSeen(false);
  autopilot();
});

afterAll(() => {
  unsubscribe.forEach((u) => u());
  unsubscribe = [];
});

describe("full journey", () => {
  it("plays from the title screen to the ending", async () => {
    game.boot();
    expect(useUIStore.getState().phase).toBe("title");

    void game.startNewJourney();
    await waitForScene("strange-place");

    for (const sceneId of SCENE_ORDER) {
      if (sceneId === "awakening") continue;
      await waitForScene(sceneId);
      const def = SCENES[sceneId];
      if (def.objective) {
        await waitIdle();
        expect(useProgressStore.getState().sceneId, `still in ${sceneId} when acting`).toBe(sceneId);
        const act = OBJECTIVE_ACTIONS[def.objective.id];
        expect(act, `no driver for objective ${def.objective.id}`).toBeTypeOf("function");
        act();
      }
      if (def.next) await waitForScene(def.next);
    }

    // Ending reached with the celebratory answer.
    await wait(300);
    const ui = useUIStore.getState();
    const progress = useProgressStore.getState();
    expect(progress.sceneId).toBe("new-beginning");
    expect(progress.answer).toBe("yes");
    expect(ui.overlay?.type).toBe("ending");

    // Every scene was visited in order and every environment was mounted once per chapter.
    expect(seenScenes.filter((s) => s !== "awakening")).toEqual(SCENE_ORDER.filter((s) => s !== "awakening"));
    expect(environmentsMounted).toEqual(["sky-island", "memory-garden", "ocean", "castle", "final-garden"]);

    // Story beats that must have appeared.
    for (const type of ["intro", "controls", "chapter-intro", "chapter-complete", "letter", "summary", "proposal", "ending"]) {
      expect(seenOverlays.has(type), `overlay ${type} never shown`).toBe(true);
    }
    expect([...progress.completedScenes].sort()).toEqual([...SCENE_ORDER].sort()); // 100 % — every scene, intro and ending included
    expect(progress.inventory).toEqual(expect.arrayContaining(["letter-first", "letter-from-me", "gift-heart", ...KEY_IDS, ...FRAGMENT_IDS]));
  }, 120000);

  it("restarts a chapter from its first scene with that chapter's loot removed", async () => {
    useUIStore.getState().closeAllOverlays();
    useProgressStore.getState().setScene("three-keys");
    await game.restartChapter("ch4");
    await waitForScene("forgotten-castle");
    await waitIdle();
    const progress = useProgressStore.getState();
    expect(progress.sceneId).toBe("forgotten-castle");
    expect(progress.inventory).not.toEqual(expect.arrayContaining(KEY_IDS));
    expect(progress.inventory).toEqual(expect.arrayContaining(BOTTLE_IDS)); // earlier chapters untouched
    expect(progress.objectiveProgress["collect-keys"] ?? 0).toBe(0);
    expect(progress.completedScenes).not.toContain("three-keys");
  }, 30000);

  it("offers a gentle ending for 'not yet' and lets the question be revisited", async () => {
    useUIStore.getState().closeAllOverlays();
    const progress = useProgressStore.getState();
    autoAnswer = false;
    progress.setScene("the-gift");
    progress.setAnswer(null);
    await waitIdle();
    OBJECTIVE_ACTIONS["open-gift"]();
    await waitForScene("the-question");
    const start = Date.now();
    while (useUIStore.getState().overlay?.type !== "proposal" && Date.now() - start < 15000) await wait(20);
    await game.answer("not-yet");
    await waitForScene("new-beginning");
    await wait(200);
    expect(useProgressStore.getState().answer).toBe("not-yet");
    const ending = useUIStore.getState().overlay;
    expect(ending?.type).toBe("ending");
    expect(ending && "answer" in ending ? ending.answer : null).toBe("not-yet");
  }, 30000);

  it("resumes from the last checkpoint after a reload", async () => {
    // Pretend the recipient closed the tab in the middle of chapter 3.
    const progress = useProgressStore.getState();
    progress.setScene("message-bottles");
    progress.setCheckpoint("message-bottles");
    useUIStore.getState().closeAllOverlays();
    useUIStore.getState().setPhase("title");

    void game.continueJourney();
    await waitForScene("message-bottles");
    await waitIdle();
    expect(useUIStore.getState().activeEnvironment).toBe("ocean");
    expect(useProgressStore.getState().sceneId).toBe("message-bottles");
  }, 30000);
});
