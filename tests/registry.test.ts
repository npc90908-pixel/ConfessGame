import { describe, expect, it } from "vitest";
import { CHAPTERS, SCENES, SCENE_ORDER, TOTAL_SCENES, getChapterOfScene, getScene, isFirstSceneOfChapter, isLastSceneOfChapter, nextChapter } from "@/game/scenes/registry";
import { story } from "@/config/story";
import type { SceneId } from "@/types/game";

describe("scene registry", () => {
  it("has 25 scenes in 5 chapters of 5", () => {
    expect(TOTAL_SCENES).toBe(25);
    expect(Object.keys(CHAPTERS)).toHaveLength(5);
    for (const chapter of Object.values(CHAPTERS)) expect(chapter.scenes).toHaveLength(5);
  });

  it("forms a single linear chain from the first scene to the ending", () => {
    const visited = new Set<string>();
    let id: SceneId | null = SCENE_ORDER[0];
    while (id) {
      expect(visited.has(id), `cycle at ${id}`).toBe(false);
      visited.add(id);
      id = getScene(id).next ?? null;
    }
    expect(visited.size).toBe(TOTAL_SCENES);
    expect([...visited].at(-1)).toBe("new-beginning");
  });

  it("assigns every scene to the chapter that lists it", () => {
    for (const chapter of Object.values(CHAPTERS)) {
      for (const sceneId of chapter.scenes) {
        expect(getChapterOfScene(sceneId).id).toBe(chapter.id);
        expect(getScene(sceneId).environment).toBe(chapter.environment);
      }
    }
  });

  it("marks chapter boundaries consistently", () => {
    for (const chapter of Object.values(CHAPTERS)) {
      expect(isFirstSceneOfChapter(chapter.scenes[0])).toBe(true);
      expect(isLastSceneOfChapter(chapter.scenes[4])).toBe(true);
      expect(isFirstSceneOfChapter(chapter.scenes[2])).toBe(false);
    }
    expect(nextChapter("ch1")).toBe("ch2");
    expect(nextChapter("ch5")).toBeNull();
  });

  it("uses objective totals that match the collectible counts", () => {
    const totals: Record<string, number> = {
      "collect-lights": 3,
      "collect-flowers": 5,
      "view-memories": story.memories.length,
      "collect-bottles": story.bottles.length,
      "collect-keys": story.keys.length,
      "unlock-fragments": story.fragments.length,
      "follow-path": 3,
    };
    for (const scene of Object.values(SCENES)) {
      if (!scene.objective) continue;
      const expected = totals[scene.objective.id] ?? 1;
      expect(scene.objective.total, scene.id).toBe(expected);
    }
  });

  it("has every chapter's music and ambience declared in the story", () => {
    for (const chapter of Object.values(CHAPTERS)) {
      expect(story.music, chapter.id).toHaveProperty(chapter.music);
      expect(story.chapters[chapter.id].title.length).toBeGreaterThan(0);
    }
  });
});
