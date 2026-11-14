import { describe, expect, it } from "vitest";
import { story } from "@/config/story";
import { validateStory } from "@/config/schema";
import { MUSIC_TRACKS } from "@/config/assets";

describe("story config", () => {
  it("passes the schema", () => {
    expect(() => validateStory(story)).not.toThrow();
  });

  it("references real music tracks", () => {
    for (const [key, trackId] of Object.entries(story.music)) {
      expect(MUSIC_TRACKS, `story.music.${key}`).toHaveProperty(trackId);
    }
  });

  it("has exactly five memories, flowers, three bottles, keys and fragments", () => {
    expect(story.memories).toHaveLength(5);
    expect(story.bottles).toHaveLength(3);
    expect(story.keys).toHaveLength(3);
    expect(story.fragments).toHaveLength(3);
  });

  it("links every fragment to an existing key", () => {
    const keyIds = new Set(story.keys.map((k) => k.id));
    for (const fragment of story.fragments) expect(keyIds.has(fragment.keyId), fragment.id).toBe(true);
  });

  it("uses unique ids for memories, bottles, keys and fragments", () => {
    const ids = [...story.memories, ...story.bottles, ...story.keys, ...story.fragments].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
