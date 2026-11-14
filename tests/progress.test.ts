import { beforeEach, describe, expect, it } from "vitest";
import { EMPTY_SAVE, saveSchema, useProgressStore } from "@/store/progressStore";

describe("progress store", () => {
  beforeEach(() => {
    useProgressStore.setState({ ...EMPTY_SAVE });
  });

  it("starts a new journey from a clean slate", () => {
    useProgressStore.getState().startNewJourney();
    const s = useProgressStore.getState();
    expect(s.started).toBe(true);
    expect(s.inventory).toEqual([]);
    expect(s.completedScenes).toEqual([]);
  });

  it("never duplicates inventory items and rejects unknown ones", () => {
    const { addItem } = useProgressStore.getState();
    expect(addItem("flower-1")).toBe(true);
    expect(addItem("flower-1")).toBe(false);
    expect(addItem("not-a-thing")).toBe(false);
    expect(useProgressStore.getState().inventory).toEqual(["flower-1"]);
  });

  it("tracks objective progress and scene completion", () => {
    const api = useProgressStore.getState();
    api.setObjectiveProgress("collect-flowers", 2);
    api.completeScene("little-things");
    api.completeScene("little-things");
    const s = useProgressStore.getState();
    expect(s.objectiveProgress["collect-flowers"]).toBe(2);
    expect(s.completedScenes).toEqual(["little-things"]);
  });

  it("accepts a valid persisted save and rejects a corrupted one", () => {
    expect(saveSchema.safeParse(EMPTY_SAVE).success).toBe(true);
    expect(saveSchema.safeParse({ ...EMPTY_SAVE, sceneId: "nope" }).success).toBe(false);
    expect(saveSchema.safeParse({ ...EMPTY_SAVE, inventory: "flower-1" }).success).toBe(false);
  });
});
