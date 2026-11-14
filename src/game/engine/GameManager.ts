"use client";

import gsap from "gsap";
import { story } from "@/config/story";
import { audio } from "@/game/systems/audio/AudioManager";
import { getItem } from "@/game/systems/items";
import {
  CHAPTERS,
  SCENES,
  isFirstSceneOfChapter,
  isLastSceneOfChapter,
} from "@/game/scenes/registry";
import { useProgressStore } from "@/store/progressStore";
import { prefersReducedMotion, useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import type { Answer, ChapterId, EnvironmentId, IconName, Overlay, SceneId, SpawnPoint } from "@/types/game";
import type { DialogueLine, Letter } from "@/types/story";
import { sleep } from "@/lib/utils";
import { clearInteractables } from "./interactions";
import { clearInput } from "./input";
import { runtime, spawnPlayer, type CameraRig } from "./runtime";
import { runSceneScript } from "@/game/scenes/scripts";

export interface CinematicContext {
  rig: CameraRig;
  /** Show a subtitle line at a timeline position. */
  subtitle: (tl: gsap.core.Timeline, text: string, at: number, duration?: number) => void;
  reducedMotion: boolean;
}

interface CinematicHandle {
  tl: gsap.core.Timeline;
  finish: () => void;
}

const VEIL_DURATION = 900;

/**
 * The GameManager owns the flow of the adventure: which scene is active, how
 * scenes hand over to each other, chapter transitions, dialogue/letter
 * promises and cinematic timelines. Rendering lives in R3F components that
 * read the stores; they call back into this class when something happens.
 */
export class GameManager {
  private mountedEnvironment: EnvironmentId | null = null;
  private environmentWaiters: Array<{ id: EnvironmentId; resolve: () => void }> = [];
  private cinematic: CinematicHandle | null = null;
  private playTimer: number | null = null;
  private entering = false;
  private pendingScene: SceneId | null = null;
  private booted = false;

  /* ------------------------------------------------------------------ */
  /*  Boot / title                                                      */
  /* ------------------------------------------------------------------ */

  boot() {
    if (this.booted) return;
    this.booted = true;
    audio.init();
    runtime.camera.mode = "title";
    useUIStore.getState().setPhase("title");
    useUIStore.getState().setVeil(0);
    audio.playMusic("menu");
    this.startPlayClock();
  }

  private startPlayClock() {
    if (this.playTimer !== null || typeof window === "undefined") return;
    this.playTimer = window.setInterval(() => {
      const ui = useUIStore.getState();
      if (ui.phase === "playing" && !ui.overlay) {
        useProgressStore.getState().addPlayTime(5000);
      }
    }, 5000);
  }

  async startNewJourney() {
    audio.unlock();
    audio.stopMusic(600);
    const progress = useProgressStore.getState();
    progress.startNewJourney();
    const ui = useUIStore.getState();
    ui.setPhase("playing");
    ui.setHudHidden(true);
    await this.openOverlayAndWait({ type: "intro" });
    // The intro sequence *is* scene 01.
    useProgressStore.getState().completeScene("awakening");
    await this.enterScene("strange-place");
  }

  async continueJourney() {
    audio.unlock();
    audio.stopMusic(600);
    const { checkpointSceneId } = useProgressStore.getState();
    if (checkpointSceneId === "awakening") {
      await this.startNewJourney();
      return;
    }
    useUIStore.getState().setPhase("playing");
    await this.enterScene(checkpointSceneId, { resume: true });
  }

  async returnToTitle() {
    this.cancelCinematic();
    const ui = useUIStore.getState();
    ui.closeAllOverlays();
    ui.skipDialogue();
    ui.setSubtitle(null);
    await this.fadeOut();
    clearInteractables();
    clearInput();
    runtime.player.mode = "none";
    // The title screen looks out over the floating island.
    ui.setActiveEnvironment("sky-island", this.mountedEnvironment === "sky-island");
    ui.setHudHidden(false);
    ui.setPhase("title");
    runtime.camera.mode = "title";
    audio.stopAmbient(600);
    audio.stopAllLoops();
    audio.playMusic("menu");
    await this.fadeIn();
  }

  /* ------------------------------------------------------------------ */
  /*  Scene flow                                                        */
  /* ------------------------------------------------------------------ */

  get currentScene() {
    return SCENES[useProgressStore.getState().sceneId];
  }

  private resolveSpawn(id: SceneId): SpawnPoint | null {
    const def = SCENES[id];
    if (def.spawn) return def.spawn;
    const chapter = CHAPTERS[def.chapter];
    const idx = chapter.scenes.indexOf(id);
    for (let i = idx - 1; i >= 0; i--) {
      const s = SCENES[chapter.scenes[i]];
      if (s.spawn) return s.spawn;
    }
    return null;
  }

  async enterScene(id: SceneId, opts: { resume?: boolean; forceRemount?: boolean } = {}) {
    if (this.entering) {
      this.pendingScene = id;
      return;
    }
    this.entering = true;
    try {
      const def = SCENES[id];
      const chapter = CHAPTERS[def.chapter];
      const progress = useProgressStore.getState();
      const ui = useUIStore.getState();
      const envChanged = this.mountedEnvironment !== def.environment || opts.forceRemount;
      const firstOfChapter = isFirstSceneOfChapter(id);
      const fromTitle = runtime.camera.mode === "title";

      progress.setScene(id);
      if (def.checkpoint) progress.setCheckpoint(id);
      ui.setHudHidden(Boolean(def.hideHud));
      ui.setPhase("playing");

      if (envChanged) {
        await this.fadeOut();
        ui.setTransition(true, `${story.chapters[def.chapter].title}`);
        clearInteractables();
        runtime.camera.mode = "follow";
        ui.setActiveEnvironment(def.environment, Boolean(opts.forceRemount));
        await this.waitForEnvironment(def.environment);
        // Give the GPU a beat to compile shaders before revealing.
        await sleep(250);
      } else if (fromTitle) {
        await this.fadeOut();
        runtime.camera.mode = "follow";
      }

      if (firstOfChapter || opts.resume || envChanged) {
        audio.playMusic(chapter.music);
        audio.playAmbient(chapter.ambient);
      }

      if (envChanged || opts.resume || fromTitle || def.spawn) {
        const spawn = this.resolveSpawn(id);
        if (spawn) spawnPlayer(spawn.position, spawn.yaw);
      }

      if (def.environment !== "ocean") runtime.player.mode = "walk";
      else if (runtime.player.mode === "none") runtime.player.mode = "walk";

      if (envChanged) ui.setTransition(false);

      if (firstOfChapter && !opts.resume) {
        await this.openOverlayAndWait({ type: "chapter-intro", chapterId: def.chapter });
      } else if (firstOfChapter && opts.resume) {
        await this.openOverlayAndWait({ type: "chapter-intro", chapterId: def.chapter });
      }

      await this.fadeIn();
      if (def.objective) ui.flashObjective();
      this.entering = false;

      // Scene scripts run detached — explore scenes finish via objectives.
      void runSceneScript(id, this, { resume: Boolean(opts.resume) });
    } finally {
      this.entering = false;
      if (this.pendingScene) {
        const next = this.pendingScene;
        this.pendingScene = null;
        void this.enterScene(next);
      }
    }
  }

  /** Called by an environment component once its assets are mounted. */
  notifyEnvironmentReady(id: EnvironmentId) {
    this.mountedEnvironment = id;
    runtime.environmentReady = id;
    useUIStore.getState().setReadyEnvironment(id);
    const remaining: typeof this.environmentWaiters = [];
    for (const waiter of this.environmentWaiters) {
      if (waiter.id === id) waiter.resolve();
      else remaining.push(waiter);
    }
    this.environmentWaiters = remaining;
  }

  notifyEnvironmentUnmounted(id: EnvironmentId) {
    if (this.mountedEnvironment === id) this.mountedEnvironment = null;
    if (useUIStore.getState().readyEnvironment === id) useUIStore.getState().setReadyEnvironment(null);
  }

  private waitForEnvironment(id: EnvironmentId) {
    if (this.mountedEnvironment === id) return Promise.resolve();
    return new Promise<void>((resolve) => {
      this.environmentWaiters.push({ id, resolve });
    });
  }

  /** Mark the current scene finished and move on (with chapter card when needed). */
  async completeScene(id: SceneId = useProgressStore.getState().sceneId) {
    const progress = useProgressStore.getState();
    if (progress.sceneId !== id) return;
    const def = SCENES[id];
    progress.completeScene(id);
    if (!def.next) return;
    if (isLastSceneOfChapter(id)) {
      progress.markChapterCompleted();
      audio.sfx("chapter-complete");
      await this.openOverlayAndWait({ type: "chapter-complete", chapterId: def.chapter });
    }
    await this.enterScene(def.next);
  }

  /**
   * Advance the active objective. Returns true when the objective (and thus
   * the scene) has been completed.
   */
  advanceObjective(objectiveId: string, opts: { by?: number; delay?: number } = {}): boolean {
    const progress = useProgressStore.getState();
    const def = SCENES[progress.sceneId];
    const value = progress.incrementObjective(objectiveId, opts.by ?? 1);
    if (def.objective?.id !== objectiveId) return false;
    useUIStore.getState().flashObjective();
    if (value >= def.objective.total) {
      audio.sfx("quest-complete", { volume: 0.8 });
      const sceneId = def.id;
      window.setTimeout(() => void this.completeScene(sceneId), opts.delay ?? 900);
      return true;
    }
    return false;
  }

  /** Objective progress for the current scene — used by the HUD. */
  objectiveProgress(objectiveId: string) {
    return useProgressStore.getState().objectiveProgress[objectiveId] ?? 0;
  }

  /** Add an item to the inventory with feedback. Returns false if already owned. */
  collect(itemId: string, opts: { sfx?: Parameters<typeof audio.sfx>[0]; toast?: boolean; icon?: IconName } = {}) {
    const added = useProgressStore.getState().addItem(itemId);
    if (!added) return false;
    const item = getItem(itemId);
    audio.sfx(opts.sfx ?? "collect");
    if (opts.toast !== false && item) {
      useUIStore.getState().pushToast({
        title: item.name,
        description: item.description,
        icon: opts.icon ?? item.icon,
        color: item.color,
      });
    }
    return true;
  }

  async restartChapter(chapterId: ChapterId = this.currentScene.chapter) {
    this.cancelCinematic();
    const ui = useUIStore.getState();
    ui.closeAllOverlays();
    ui.skipDialogue();
    useProgressStore.getState().restartChapter(chapterId);
    audio.stopAllLoops();
    await this.enterScene(CHAPTERS[chapterId].scenes[0], { resume: true, forceRemount: true });
  }

  async resetAll() {
    this.cancelCinematic();
    useProgressStore.getState().resetProgress();
    await this.returnToTitle();
  }

  /* ------------------------------------------------------------------ */
  /*  Dialogue, letters, overlays                                       */
  /* ------------------------------------------------------------------ */

  say(lines: DialogueLine[]): Promise<void> {
    return new Promise((resolve) => {
      audio.duckMusic(0.5);
      useUIStore.getState().showDialogue({
        lines,
        onComplete: () => {
          audio.unduckMusic();
          resolve();
        },
      });
    });
  }

  /** Open an overlay and resolve once it has been closed. */
  openOverlayAndWait(overlay: Overlay): Promise<void> {
    const ui = useUIStore.getState();
    ui.openOverlay(overlay);
    const opened = useUIStore.getState().overlay;
    if (!opened) return Promise.resolve();
    return new Promise((resolve) => {
      const unsubscribe = useUIStore.subscribe((state) => {
        if (state.overlay !== opened && !state.overlayStack.includes(opened)) {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  async openLetter(letter: Letter, opts: { closable?: boolean } = {}) {
    audio.sfx("letter-open");
    audio.duckMusic(0.4);
    await this.openOverlayAndWait({ type: "letter", letterId: letter.id, closable: opts.closable ?? true });
    audio.unduckMusic();
  }

  async openMemory(memoryId: string) {
    audio.sfx("memory-open");
    useProgressStore.getState().markMemoryViewed(memoryId);
    await this.openOverlayAndWait({ type: "memory", memoryId });
  }

  async openBottle(bottleId: string) {
    audio.sfx("bottle-open");
    useProgressStore.getState().markBottleOpened(bottleId);
    await this.openOverlayAndWait({ type: "bottle", bottleId });
  }

  async openFragment(fragmentId: string) {
    audio.sfx("door-unlock", { volume: 0.5 });
    useProgressStore.getState().unlockFragment(fragmentId);
    await this.openOverlayAndWait({ type: "fragment", fragmentId });
  }

  pause() {
    const ui = useUIStore.getState();
    if (ui.phase !== "playing" || ui.overlay) return;
    audio.sfx("ui-open");
    ui.openOverlay({ type: "pause" });
  }

  resume() {
    const ui = useUIStore.getState();
    if (ui.overlay?.type === "pause") {
      audio.sfx("ui-close");
      ui.closeOverlay();
    }
  }

  toggleInventory() {
    const ui = useUIStore.getState();
    if (ui.phase !== "playing" || ui.cinematic) return;
    if (ui.overlay?.type === "inventory") {
      audio.sfx("ui-close");
      ui.closeOverlay();
    } else if (!ui.overlay) {
      audio.sfx("ui-open");
      ui.openOverlay({ type: "inventory" });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Cinematics (GSAP owns the camera rig while active)                */
  /* ------------------------------------------------------------------ */

  playCinematic(
    build: (tl: gsap.core.Timeline, ctx: CinematicContext) => void,
    opts: { skippable?: boolean; hideHud?: boolean; keepCameraMode?: boolean } = {},
  ): Promise<void> {
    this.cancelCinematic();
    const rig = runtime.camera;
    const previousMode = rig.mode;
    rig.cinematicPosition.copy(rig.position);
    rig.cinematicTarget.copy(rig.target);
    rig.cinematicFov = rig.fov;
    rig.mode = "cinematic";
    const ui = useUIStore.getState();
    ui.setCinematic(true, opts.skippable ?? true);
    const reducedMotion = prefersReducedMotion(useSettingsStore.getState().motion);

    const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
    tl.timeScale(story.animationSpeed * (reducedMotion ? 1.75 : 1));

    const ctx: CinematicContext = {
      rig,
      reducedMotion,
      subtitle: (timeline, text, at, duration = 3.2) => {
        timeline.call(() => useUIStore.getState().setSubtitle(text), [], at);
        timeline.call(
          () => {
            if (useUIStore.getState().subtitle === text) useUIStore.getState().setSubtitle(null);
          },
          [],
          at + duration,
        );
      },
    };
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.cinematic = null;
      tl.kill();
      useUIStore.getState().setSubtitle(null);
      useUIStore.getState().setCinematic(false);
      rig.mode = opts.keepCameraMode ? previousMode : previousMode === "cinematic" ? "follow" : previousMode;
      if (rig.mode === "cinematic") rig.mode = "follow";
    };

    try {
      build(tl, ctx);
    } catch (error) {
      // A broken script must never leave the player locked in a cinematic.
      finish();
      return Promise.reject(error);
    }

    return new Promise<void>((resolve) => {
      const complete = () => {
        finish();
        resolve();
      };
      tl.eventCallback("onComplete", complete);
      this.cinematic = { tl, finish: complete };
      tl.play();
    });
  }

  skipCinematic() {
    const c = this.cinematic;
    if (!c || !useUIStore.getState().cinematicSkippable) return;
    audio.sfx("whoosh", { volume: 0.5 });
    c.tl.progress(1);
    c.finish();
  }

  /** Finish the running cinematic regardless of the skippable flag. */
  skipCinematicInternal() {
    const c = this.cinematic;
    if (!c) return;
    c.tl.progress(1);
    c.finish();
  }

  private cancelCinematic() {
    const c = this.cinematic;
    if (!c) return;
    c.tl.kill();
    c.finish();
  }

  /* ------------------------------------------------------------------ */
  /*  Veil                                                              */
  /* ------------------------------------------------------------------ */

  async fadeOut(duration = VEIL_DURATION) {
    useUIStore.getState().setVeil(1);
    await sleep(duration);
  }

  async fadeIn(duration = VEIL_DURATION) {
    useUIStore.getState().setVeil(0);
    await sleep(duration * 0.6);
  }

  /* ------------------------------------------------------------------ */
  /*  Ending                                                            */
  /* ------------------------------------------------------------------ */

  async answer(answer: Answer) {
    const progress = useProgressStore.getState();
    progress.setAnswer(answer);
    progress.completeScene("the-question");
    useUIStore.getState().closeOverlay();
    await this.enterScene("new-beginning");
  }
}

export const game = new GameManager();
