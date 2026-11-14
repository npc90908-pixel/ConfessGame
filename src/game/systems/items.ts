import { story } from "@/config/story";
import type { InventoryItem, ItemCategory } from "@/types/game";

/**
 * Catalogue of every collectible in the adventure. Inventory stores item ids;
 * this table turns them back into something displayable.
 */

const lights: InventoryItem[] = [1, 2, 3].map((n) => ({
  id: `light-${n}`,
  category: "light",
  chapter: "ch1",
  name: `Cahaya ${["Pertama", "Kedua", "Ketiga"][n - 1]}`,
  description: "A small wandering light from the floating island. It hums when you hold it.",
  icon: "light",
  color: "#f3d08a",
}));

const flowerNames = [
  ["Bunga Tawa", "For the way you laugh at your own jokes."],
  ["Bunga Hujan", "Karena kamu tidak pernah lari dari hujan."],
  ["Bunga Pagi", "For every good-morning text that fixed my day."],
  ["Bunga Diam", "Untuk diam yang terasa nyaman, bukan canggung."],
  ["Bunga Pulang", "For the long way home we always chose."],
];

const flowers: InventoryItem[] = flowerNames.map(([name, description], i) => ({
  id: `flower-${i + 1}`,
  category: "flower",
  chapter: "ch2",
  name,
  description,
  icon: "flower",
  color: ["#ff8fb8", "#b9a7ff", "#f3d08a", "#ffb7d5", "#7cc48f"][i],
}));

const memories: InventoryItem[] = story.memories.map((m) => ({
  id: m.id,
  category: "memory",
  chapter: "ch2",
  name: m.title,
  description: m.caption,
  icon: "photo",
  color: "#d7ccff",
}));

const bottles: InventoryItem[] = story.bottles.map((b, i) => ({
  id: b.id,
  category: "bottle",
  chapter: "ch3",
  name: b.title,
  description: b.text,
  icon: "bottle",
  color: ["#8fd3ff", "#b9a7ff", "#ff9fc4"][i % 3],
}));

const stars: InventoryItem[] = [1, 2, 3].map((n) => ({
  id: `star-fragment-${n}`,
  category: "star",
  chapter: "ch3",
  name: `Pecahan Bintang ${["I", "II", "III"][n - 1]}`,
  description: "A fragment of the constellation we drew together over the silent ocean.",
  icon: "star",
  color: "#fff1c9",
}));

const keys: InventoryItem[] = story.keys.map((k) => ({
  id: k.id,
  category: "key",
  chapter: "ch4",
  name: k.name,
  description: k.description,
  icon: "key",
  color: k.color,
}));

const fragments: InventoryItem[] = story.fragments.map((f) => ({
  id: f.id,
  category: "fragment",
  chapter: "ch4",
  name: f.title,
  description: f.lines.join(" "),
  icon: "scroll",
  color: "#f8dfa3",
}));

const letters: InventoryItem[] = [
  {
    id: "letter-first",
    category: "letter",
    chapter: "ch1",
    name: story.letters.firstMessage.title,
    description: story.letters.firstMessage.paragraphs[0],
    icon: "letter",
    color: "#ffe3ee",
  },
  {
    id: "letter-from-me",
    category: "letter",
    chapter: "ch4",
    name: story.letters.fromMe.title,
    description: story.letters.fromMe.paragraphs[0],
    icon: "letter",
    color: "#ffe3ee",
  },
];

const gifts: InventoryItem[] = [
  {
    id: "gift-heart",
    category: "gift",
    chapter: "ch5",
    name: "Hati yang Bercahaya",
    description: "The glowing heart from inside the gift box. It was never really a gift — it was a question.",
    icon: "heart",
    color: "#ff6fa3",
  },
];

export const ITEMS: Record<string, InventoryItem> = Object.fromEntries(
  [...lights, ...flowers, ...memories, ...bottles, ...stars, ...keys, ...fragments, ...letters, ...gifts].map(
    (item) => [item.id, item],
  ),
);

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  light: "Cahaya",
  flower: "Bunga",
  memory: "Kenangan",
  bottle: "Pesan Botol",
  star: "Pecahan Bintang",
  key: "Kunci",
  fragment: "Fragmen Surat",
  letter: "Surat",
  gift: "Hadiah",
};

export const CATEGORY_ORDER: ItemCategory[] = [
  "light",
  "flower",
  "memory",
  "bottle",
  "star",
  "key",
  "fragment",
  "letter",
  "gift",
];

export function getItem(id: string): InventoryItem | undefined {
  return ITEMS[id];
}

export const LIGHT_IDS = lights.map((i) => i.id);
export const FLOWER_IDS = flowers.map((i) => i.id);
export const MEMORY_IDS = memories.map((i) => i.id);
export const BOTTLE_IDS = bottles.map((i) => i.id);
export const KEY_IDS = keys.map((i) => i.id);
export const FRAGMENT_IDS = fragments.map((i) => i.id);
export const STAR_IDS = stars.map((i) => i.id);
