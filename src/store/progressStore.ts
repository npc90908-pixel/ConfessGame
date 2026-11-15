"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { CHAPTERS, SCENES, SCENE_ORDER } from "@/game/scenes/registry";
import { ITEMS } from "@/game/systems/items";
import type { Answer, ChapterId, ItemCategory, PuzzleState, SceneId } from "@/types/game";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "ajtyh:progress:v1";

/* -------------------------------------------------------------------------- */
/*  Persisted shape + validation                                              */
/* -------------------------------------------------------------------------- */

const sceneIdSchema = z.custom<SceneId>((v) => typeof v === "string" && v in SCENES);

export const saveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  started: z.boolean(),
  sceneId: sceneIdSchema,
  checkpointSceneId: sceneIdSchema,
  completedScenes: z.array(sceneIdSchema),
  inventory: z.array(z.string()),
  objectiveProgress: z.record(z.string(), z.number()),
  flags: z.record(z.string(), z.boolean()),
  viewedMemories: z.array(z.string()),
  openedBottles: z.array(z.string()),
  unlockedFragments: z.array(z.string()),
  solvedConstellations: z.array(z.string()),
  puzzleState: z.enum(["locked", "active", "solved"]),
  answer: z.enum(["yes", "not-yet"]).nullable(),
  stats: z.object({
    startedAt: z.number().nullable(),
    completedAt: z.number().nullable(),
    playTimeMs: z.number(),
    chaptersCompleted: z.number(),
  }),
});

export type SaveData = z.infer<typeof saveSchema>;

export const EMPTY_SAVE: SaveData = {
  version: SAVE_VERSION,
  started: false,
  sceneId: "awakening",
  checkpointSceneId: "awakening",
  completedScenes: [],
  inventory: [],
  objectiveProgress: {},
  flags: {},
  viewedMemories: [],
  openedBottles: [],
  unlockedFragments: [],
  solvedConstellations: [],
  puzzleState: "locked",
  answer: null,
  stats: { startedAt: null, completedAt: null, playTimeMs: 0, chaptersCompleted: 0 },
};

/* -------------------------------------------------------------------------- */
/*  Store                                                                      */
/* -------------------------------------------------------------------------- */

export interface ProgressState extends SaveData {
  startNewJourney: () => void;
  setScene: (id: SceneId) => void;
  setCheckpoint: (id: SceneId) => void;
  completeScene: (id: SceneId) => void;
  addItem: (id: string) => boolean;
  hasItem: (id: string) => boolean;
  countCategory: (category: ItemCategory) => number;
  setObjectiveProgress: (objectiveId: string, value: number) => void;
  incrementObjective: (objectiveId: string, by?: number) => number;
  setFlag: (key: string, value?: boolean) => void;
  getFlag: (key: string) => boolean;
  markMemoryViewed: (id: string) => void;
  markBottleOpened: (id: string) => void;
  unlockFragment: (id: string) => void;
  setPuzzleState: (state: PuzzleState) => void;
  solveConstellation: (id: string) => void;
  setAnswer: (answer: Answer | null) => void;
  addPlayTime: (ms: number) => void;
  markChapterCompleted: () => void;
  restartChapter: (chapterId: ChapterId) => void;
  resetProgress: () => void;
  /** Replace the whole save (used by import / tests). */
  load: (data: SaveData) => void;
}

const CHAPTER_CATEGORIES: Record<ChapterId, ItemCategory[]> = {
  ch1: ["light"],
  ch2: ["flower", "memory"],
  ch3: ["bottle", "star"],
  ch4: ["key", "fragment"],
  ch5: ["gift"],
};

const uniquePush = (arr: string[], id: string) => (arr.includes(id) ? arr : [...arr, id]);

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...EMPTY_SAVE,

      startNewJourney: () =>
        set({
          ...EMPTY_SAVE,
          started: true,
          stats: { ...EMPTY_SAVE.stats, startedAt: Date.now() },
        }),

      setScene: (sceneId) => set({ sceneId }),

      setCheckpoint: (checkpointSceneId) => set({ checkpointSceneId }),

      completeScene: (id) =>
        set((s) => ({
          completedScenes: s.completedScenes.includes(id) ? s.completedScenes : [...s.completedScenes, id],
        })),

      addItem: (id) => {
        if (!ITEMS[id]) {
          console.warn(`[inventory] unknown item "${id}"`);
          return false;
        }
        if (get().inventory.includes(id)) return false;
        set((s) => ({ inventory: [...s.inventory, id] }));
        return true;
      },

      hasItem: (id) => get().inventory.includes(id),

      countCategory: (category) =>
        get().inventory.filter((id) => ITEMS[id]?.category === category).length,

      setObjectiveProgress: (objectiveId, value) =>
        set((s) => ({ objectiveProgress: { ...s.objectiveProgress, [objectiveId]: value } })),

      incrementObjective: (objectiveId, by = 1) => {
        const next = (get().objectiveProgress[objectiveId] ?? 0) + by;
        set((s) => ({ objectiveProgress: { ...s.objectiveProgress, [objectiveId]: next } }));
        return next;
      },

      setFlag: (key, value = true) => set((s) => ({ flags: { ...s.flags, [key]: value } })),

      getFlag: (key) => Boolean(get().flags[key]),

      markMemoryViewed: (id) => set((s) => ({ viewedMemories: uniquePush(s.viewedMemories, id) })),

      markBottleOpened: (id) => set((s) => ({ openedBottles: uniquePush(s.openedBottles, id) })),

      unlockFragment: (id) => set((s) => ({ unlockedFragments: uniquePush(s.unlockedFragments, id) })),

      setPuzzleState: (puzzleState) => set({ puzzleState }),

      solveConstellation: (id) =>
        set((s) => ({ solvedConstellations: uniquePush(s.solvedConstellations, id) })),

      setAnswer: (answer) =>
        set((s) => ({
          answer,
          stats: { ...s.stats, completedAt: answer ? Date.now() : s.stats.completedAt },
        })),

      addPlayTime: (ms) =>
        set((s) => ({ stats: { ...s.stats, playTimeMs: s.stats.playTimeMs + Math.max(0, ms) } })),

      markChapterCompleted: () =>
        set((s) => ({ stats: { ...s.stats, chaptersCompleted: s.stats.chaptersCompleted + 1 } })),

      restartChapter: (chapterId) => {
        const chapter = CHAPTERS[chapterId];
        const firstScene = chapter.scenes[0];
        const categories = new Set(CHAPTER_CATEGORIES[chapterId]);
        const chapterScenes = new Set<SceneId>(chapter.scenes);
        const chapterObjectiveIds = new Set(
          chapter.scenes.map((id) => SCENES[id].objective?.id).filter(Boolean) as string[],
        );
        set((s) => {
          const objectiveProgress = Object.fromEntries(
            Object.entries(s.objectiveProgress).filter(([k]) => !chapterObjectiveIds.has(k)),
          );
          const flags = Object.fromEntries(
            Object.entries(s.flags).filter(([k]) => !k.startsWith(`${chapterId}:`)),
          );
          const base: Partial<SaveData> = {
            sceneId: firstScene,
            checkpointSceneId: firstScene,
            completedScenes: s.completedScenes.filter((id) => !chapterScenes.has(id)),
            inventory: s.inventory.filter((id) => {
              const item = ITEMS[id];
              if (!item) return false;
              if (chapterId === "ch4" && id === "letter-from-me") return false;
              if (chapterId === "ch1" && id === "letter-first") return false;
              if (item.category === "keepsake") return item.chapter !== chapterId;
              return !categories.has(item.category);
            }),
            objectiveProgress,
            flags,
          };
          if (chapterId === "ch2") base.viewedMemories = [];
          if (chapterId === "ch3") {
            base.openedBottles = [];
            base.solvedConstellations = [];
            base.puzzleState = "locked";
          }
          if (chapterId === "ch4") base.unlockedFragments = [];
          if (chapterId === "ch5") base.answer = null;
          return base;
        });
      },

      resetProgress: () => set({ ...EMPTY_SAVE }),

      load: (data) => set({ ...data }),
    }),
    {
      name: SAVE_KEY,
      version: SAVE_VERSION,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : window.localStorage,
      ),
      partialize: (s): SaveData => ({
        version: SAVE_VERSION,
        started: s.started,
        sceneId: s.sceneId,
        checkpointSceneId: s.checkpointSceneId,
        completedScenes: s.completedScenes,
        inventory: s.inventory,
        objectiveProgress: s.objectiveProgress,
        flags: s.flags,
        viewedMemories: s.viewedMemories,
        openedBottles: s.openedBottles,
        unlockedFragments: s.unlockedFragments,
        solvedConstellations: s.solvedConstellations,
        puzzleState: s.puzzleState,
        answer: s.answer,
        stats: s.stats,
      }),
      merge: (persisted, current) => {
        // First visit: nothing stored yet.
        if (persisted === undefined || persisted === null) return current;
        const parsed = saveSchema.safeParse(persisted);
        if (!parsed.success) {
          console.warn("[save] Stored progress was invalid and has been ignored.", parsed.error.issues);
          return current;
        }
        return { ...current, ...parsed.data };
      },
    },
  ),
);

/* -------------------------------------------------------------------------- */
/*  Selectors                                                                 */
/* -------------------------------------------------------------------------- */

export const selectHasSave = (s: ProgressState) => s.started && s.checkpointSceneId !== "awakening";

export const selectProgressPercent = (s: ProgressState) =>
  Math.round((s.completedScenes.length / SCENE_ORDER.length) * 100);
