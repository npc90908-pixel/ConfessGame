import { describe, expect, it } from "vitest";
import { BOTTLE_IDS, FLOWER_IDS, FRAGMENT_IDS, ITEMS, KEY_IDS, LIGHT_IDS, MEMORY_IDS, getItem } from "@/game/systems/items";
import { story } from "@/config/story";

describe("inventory items", () => {
  it("defines every collectible the environments hand out", () => {
    const expected = [
      "light-1", "light-2", "light-3",
      "flower-1", "flower-2", "flower-3", "flower-4", "flower-5",
      ...story.memories.map((m) => m.id),
      ...story.bottles.map((b) => b.id),
      ...story.keys.map((k) => k.id),
      ...story.fragments.map((f) => f.id),
      "letter-first", "letter-from-me", "gift-heart",
    ];
    for (const id of expected) expect(getItem(id), id).toBeDefined();
  });

  it("groups ids by category with the right counts", () => {
    expect(LIGHT_IDS).toHaveLength(3);
    expect(FLOWER_IDS).toHaveLength(5);
    expect(MEMORY_IDS).toHaveLength(5);
    expect(BOTTLE_IDS).toHaveLength(3);
    expect(KEY_IDS).toHaveLength(3);
    expect(FRAGMENT_IDS).toHaveLength(3);
  });

  it("gives every item a name, icon and colour", () => {
    for (const item of Object.values(ITEMS)) {
      expect(item.name.length, item.id).toBeGreaterThan(0);
      expect(item.icon, item.id).toBeTruthy();
      expect(item.color, item.id).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
