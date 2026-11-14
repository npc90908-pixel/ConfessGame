"use client";

import gsap from "gsap";
import { story } from "@/config/story";
import { audio } from "@/game/systems/audio/AudioManager";
import { useProgressStore } from "@/store/progressStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import type { SceneId } from "@/types/game";
import { fx } from "@/game/engine/fx";
import { runtime } from "@/game/engine/runtime";
import { hold, moveCamera, orbitCamera, setCamera } from "@/game/animations/camera";
import { CASTLE, FINAL, GARDEN, SKY_ISLAND } from "./landmarks";
import type { GameManager } from "./scriptTypes";

interface ScriptOptions {
  resume: boolean;
}

type Script = (game: GameManager, opts: ScriptOptions) => Promise<void> | void;

const d = story.dialogue;

/** Show the movement tutorial once. */
async function maybeShowControls(game: GameManager, mode: "walk" | "boat") {
  const settings = useSettingsStore.getState();
  const flagKey = mode === "walk" ? "controlsSeen" : "ch3:boat-controls-seen";
  if (mode === "walk") {
    if (settings.controlsSeen) return;
    await game.openOverlayAndWait({ type: "controls", mode });
    settings.setControlsSeen(true);
  } else {
    const progress = useProgressStore.getState();
    if (progress.getFlag(flagKey)) return;
    await game.openOverlayAndWait({ type: "controls", mode });
    progress.setFlag(flagKey);
  }
}

/** Dialogue that only plays the first time a scene is entered (not on resume). */
async function introDialogue(game: GameManager, id: SceneId, lines: typeof d.strangePlace, opts: ScriptOptions) {
  const progress = useProgressStore.getState();
  const key = `seen:${id}`;
  if (opts.resume && progress.getFlag(key)) return;
  progress.setFlag(key);
  await game.say(lines);
}

const scripts: Record<SceneId, Script> = {
  /* ───────────── CHAPTER 01 ───────────── */
  awakening: () => undefined,

  "strange-place": async (game, opts) => {
    await introDialogue(game, "strange-place", d.strangePlace, opts);
    await maybeShowControls(game, "walk");
  },

  "first-message": () => undefined, // The envelope drop is driven by the island component.

  "follow-the-light": async (game, opts) => {
    await introDialogue(game, "follow-the-light", d.followTheLight, opts);
  },

  "first-portal": async (game, opts) => {
    const progress = useProgressStore.getState();
    const seen = progress.getFlag("seen:first-portal");
    progress.setFlag("seen:first-portal");
    if (!seen || !opts.resume) {
      // Reveal the portal: camera glides to the far end of the island.
      await game.playCinematic((tl, { rig, subtitle }) => {
        const p = SKY_ISLAND.portal;
        moveCamera(tl, rig, {
          position: [p[0] + 6, 3.2, p[2] + 9],
          target: [p[0], 1.8, p[2]],
          duration: 3.2,
          at: 0,
        });
        tl.to(fx, { portalPower: 1, duration: 2.6, ease: "power2.out" }, 1.0);
        tl.call(() => audio.sfx("bloom", { volume: 0.8 }), [], 1.1);
        subtitle(tl, d.allLightsCollected[0].text, 0.6, 4.2);
        moveCamera(tl, rig, {
          position: [p[0] - 4, 2.4, p[2] + 7],
          target: [p[0], 1.6, p[2]],
          duration: 3,
          at: 3.2,
        });
        hold(tl, 0.4);
      });
    } else {
      fx.portalPower = 1;
    }
    await game.say(d.portal);
  },

  /* ───────────── CHAPTER 02 ───────────── */
  "blooming-garden": async (game, opts) => {
    await introDialogue(game, "blooming-garden", d.bloomingGarden, opts);
  },
  "little-things": async (game, opts) => {
    await introDialogue(game, "little-things", d.littleThings, opts);
  },
  "memory-in-the-air": async (game, opts) => {
    await introDialogue(game, "memory-in-the-air", d.memoryInTheAir, opts);
  },
  "memory-tree": async (game, opts) => {
    await introDialogue(game, "memory-tree", d.memoryTree, opts);
  },
  "beautiful-moment": async (game) => {
    fx.gardenBloom = 1;
    await game.playCinematic((tl, { rig, subtitle }) => {
      const tree = GARDEN.memoryTree;
      setCamera(tl, rig, [tree[0] + 4, 2.2, tree[2] + 9], [tree[0], 4, tree[2]]);
      orbitCamera(tl, rig, {
        center: [tree[0], 0, tree[2]],
        radius: 14,
        height: 3,
        fromAngle: 0.3,
        toAngle: 1.9,
        duration: 7,
        toHeight: 7,
        toRadius: 20,
        targetHeight: 5,
        at: 0,
      });
      subtitle(tl, d.beautifulMoment[0].text, 1.0, 4.5);
      orbitCamera(tl, rig, {
        center: [0, 0, 0],
        radius: 30,
        height: 14,
        fromAngle: 2.2,
        toAngle: 3.4,
        duration: 7,
        toHeight: 18,
        toRadius: 34,
        targetHeight: 0,
      });
      subtitle(tl, d.beautifulMoment[1].text, 8.5, 4.5);
      hold(tl, 1);
    });
    await game.completeScene("beautiful-moment");
  },

  /* ───────────── CHAPTER 03 ───────────── */
  "silent-ocean": async (game, opts) => {
    await introDialogue(game, "silent-ocean", d.silentOcean, opts);
  },
  "sail-with-me": async (game, opts) => {
    await introDialogue(game, "sail-with-me", d.sailWithMe, opts);
    await maybeShowControls(game, "boat");
  },
  "message-bottles": async (game, opts) => {
    await introDialogue(game, "message-bottles", d.messageBottles, opts);
  },
  "star-puzzle": async (game, opts) => {
    await introDialogue(game, "star-puzzle", d.starPuzzle, opts);
  },
  "beyond-horizon": async (game) => {
    audio.stopLoop("boat-loop");
    await game.playCinematic((tl, { rig, subtitle }) => {
      const boat = runtime.player.position;
      const bx = boat.x;
      const bz = boat.z;
      setCamera(tl, rig, [bx + 6, 2.5, bz + 8], [bx, 1, bz]);
      orbitCamera(tl, rig, {
        center: [bx, 0, bz],
        radius: 10,
        height: 2.5,
        fromAngle: 0.6,
        toAngle: -0.9,
        duration: 9,
        toHeight: 5,
        toRadius: 16,
        targetHeight: 1,
        at: 0,
      });
      tl.to(fx, { oceanSunrise: 1, duration: 9, ease: "sine.inOut" }, 0.5);
      subtitle(tl, d.beyondHorizon[0].text, 1.5, 4.5);
      moveCamera(tl, rig, {
        position: [bx - 3, 3, bz + 12],
        target: [bx, 2, bz - 60],
        duration: 5,
        at: 9,
      });
      subtitle(tl, d.beyondHorizon[1].text, 9.5, 4.5);
      hold(tl, 1);
    });
    await game.completeScene("beyond-horizon");
  },

  /* ───────────── CHAPTER 04 ───────────── */
  "forgotten-castle": async (game, opts) => {
    await introDialogue(game, "forgotten-castle", d.forgottenCastle, opts);
  },
  "three-keys": async (game, opts) => {
    await introDialogue(game, "three-keys", d.threeKeys, opts);
  },
  "unspoken-words": async (game, opts) => {
    fx.castleGate = 1;
    await introDialogue(game, "unspoken-words", d.unspokenWords, opts);
  },
  "heart-chamber": async (game, opts) => {
    fx.castleGate = 1;
    fx.castleInnerDoor = 1;
    await introDialogue(game, "heart-chamber", d.heartChamber, opts);
  },
  "letter-from-me": async (game) => {
    fx.castleGate = 1;
    fx.castleInnerDoor = 1;
    // A slow push-in on the crystal heart while the letter is read.
    const h = CASTLE.heart;
    const tlPromise = game.playCinematic(
      (tl, { rig }) => {
        setCamera(tl, rig, [h[0] + 3, h[1] + 0.5, h[2] + 6], [h[0], h[1], h[2]]);
        moveCamera(tl, rig, {
          position: [h[0] - 2, h[1] + 1, h[2] + 4.5],
          target: [h[0], h[1], h[2]],
          duration: 60,
          ease: "sine.inOut",
          at: 0,
        });
      },
      { skippable: false },
    );
    await game.openLetter(story.letters.fromMe, { closable: false });
    game.collect("letter-from-me", { sfx: "paper", toast: true });
    game.skipCinematicInternal();
    await tlPromise;
    await game.completeScene("letter-from-me");
  },

  /* ───────────── CHAPTER 05 ───────────── */
  "final-path": async (game, opts) => {
    await introDialogue(game, "final-path", d.finalPath, opts);
  },
  "everything-we-found": async (game) => {
    useUIStore.getState().setHudHidden(true);
    const p = runtime.player.position;
    await game.playCinematic((tl, { rig, subtitle }) => {
      setCamera(tl, rig, [p.x + 3, p.y + 2, p.z + 6], [p.x, p.y + 1.2, p.z]);
      orbitCamera(tl, rig, {
        center: [p.x, p.y, p.z],
        radius: 6.5,
        height: 2.2,
        fromAngle: 0.4,
        toAngle: 0.4 + Math.PI * 1.2,
        duration: 11,
        toHeight: 3.2,
        toRadius: 7.5,
        targetHeight: 1.3,
        at: 0,
      });
      subtitle(tl, d.everythingWeFound[0].text, 0.8, 4.8);
      subtitle(tl, d.everythingWeFound[1].text, 6.2, 4.6);
    });
    await game.openOverlayAndWait({ type: "summary" });
    useUIStore.getState().setHudHidden(false);
    await game.completeScene("everything-we-found");
  },
  "the-gift": async (game, opts) => {
    await introDialogue(game, "the-gift", d.theGift, opts);
  },
  "the-question": async (game) => {
    fx.giftOpen = 1;
    const g = FINAL.gift;
    await game.playCinematic(
      (tl, { rig }) => {
        setCamera(tl, rig, [g[0] + 4, 2.4, g[2] + 6], [g[0], 1.2, g[2]]);
        tl.to(fx, { questionMood: 1, duration: 5, ease: "sine.inOut" }, 0);
        moveCamera(tl, rig, {
          position: [g[0] + 0.6, 1.9, g[2] + 3.6],
          target: [g[0], 1.35, g[2]],
          duration: 6,
          ease: "power1.inOut",
          fov: 42,
          at: 0,
        });
        tl.call(() => audio.sfx("heartbeat", { volume: 0.7 }), [], 2.2);
        tl.call(() => audio.sfx("heartbeat", { volume: 0.7 }), [], 4.0);
        hold(tl, 0.5);
      },
      { skippable: true },
    );
    // Keep the camera framed on the heart while the question is asked.
    runtime.camera.mode = "cinematic";
    runtime.camera.cinematicPosition.set(g[0] + 0.6, 1.9, g[2] + 3.6);
    runtime.camera.cinematicTarget.set(g[0], 1.35, g[2]);
    runtime.camera.cinematicFov = 42;
    useUIStore.getState().openOverlay({ type: "proposal" });
  },
  "new-beginning": async (game) => {
    const answer = useProgressStore.getState().answer ?? "not-yet";
    const g = FINAL.gift;
    const rig = runtime.camera;
    rig.mode = "cinematic";
    rig.cinematicPosition.set(g[0] + 0.6, 1.9, g[2] + 3.6);
    rig.cinematicTarget.set(g[0], 1.35, g[2]);
    if (answer === "yes") {
      audio.playMusic("celebration", 1200);
      gsap.to(fx, { celebration: 1, duration: 1.5, ease: "power2.out" });
      await game.playCinematic((tl, { rig: r }) => {
        setCamera(tl, r, [g[0] + 0.6, 1.9, g[2] + 3.6], [g[0], 1.35, g[2]]);
        tl.call(() => audio.sfx("firework", { volume: 0.9 }), [], 0.3);
        tl.call(() => audio.sfx("firework", { volume: 0.8, rate: 1.1 }), [], 1.1);
        tl.call(() => audio.sfx("firework", { volume: 0.8, rate: 0.9 }), [], 1.9);
        orbitCamera(tl, r, {
          center: [g[0], 0, g[2]],
          radius: 7,
          height: 2.6,
          fromAngle: 0.2,
          toAngle: 1.6,
          duration: 6,
          toHeight: 6,
          toRadius: 14,
          targetHeight: 3,
          at: 0,
        });
      });
      rig.mode = "cinematic";
      rig.cinematicPosition.set(g[0] + 14 * Math.sin(1.6), 6, g[2] + 14 * Math.cos(1.6));
      rig.cinematicTarget.set(g[0], 3, g[2]);
    } else {
      audio.playMusic("gentle", 1500);
      gsap.to(fx, { questionMood: 0.6, duration: 2 });
    }
    useUIStore.getState().openOverlay({ type: "ending", answer });
  },
};

export async function runSceneScript(id: SceneId, game: GameManager, opts: ScriptOptions) {
  try {
    await scripts[id](game, opts);
  } catch (error) {
    console.error(`[scene:${id}] script failed`, error);
  }
}
