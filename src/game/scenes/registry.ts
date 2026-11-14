import type {
  ChapterDefinition,
  ChapterId,
  SceneDefinition,
  SceneId,
} from "@/types/game";

/* -------------------------------------------------------------------------- */
/*  Chapters                                                                  */
/* -------------------------------------------------------------------------- */

export const CHAPTERS: Record<ChapterId, ChapterDefinition> = {
  ch1: {
    id: "ch1",
    number: 1,
    environment: "sky-island",
    scenes: ["awakening", "strange-place", "first-message", "follow-the-light", "first-portal"],
    music: "ch1",
    ambient: "wind",
  },
  ch2: {
    id: "ch2",
    number: 2,
    environment: "memory-garden",
    scenes: ["blooming-garden", "little-things", "memory-in-the-air", "memory-tree", "beautiful-moment"],
    music: "ch2",
    ambient: "garden",
  },
  ch3: {
    id: "ch3",
    number: 3,
    environment: "ocean",
    scenes: ["silent-ocean", "sail-with-me", "message-bottles", "star-puzzle", "beyond-horizon"],
    music: "ch3",
    ambient: "ocean",
  },
  ch4: {
    id: "ch4",
    number: 4,
    environment: "castle",
    scenes: ["forgotten-castle", "three-keys", "unspoken-words", "heart-chamber", "letter-from-me"],
    music: "ch4",
    ambient: "castle",
  },
  ch5: {
    id: "ch5",
    number: 5,
    environment: "final-garden",
    scenes: ["final-path", "everything-we-found", "the-gift", "the-question", "new-beginning"],
    music: "ch5",
    ambient: "sky",
  },
};

export const CHAPTER_ORDER: ChapterId[] = ["ch1", "ch2", "ch3", "ch4", "ch5"];

/* -------------------------------------------------------------------------- */
/*  Scenes                                                                    */
/* -------------------------------------------------------------------------- */

const defs: SceneDefinition[] = [
  // ───────────── CHAPTER 01 — THE UNKNOWN WORLD ─────────────
  {
    id: "awakening",
    number: 1,
    chapter: "ch1",
    title: "The Awakening",
    kind: "cinematic",
    environment: "sky-island",
    hideHud: true,
    checkpoint: true,
    next: "strange-place",
  },
  {
    id: "strange-place",
    number: 2,
    chapter: "ch1",
    title: "A Strange Place",
    kind: "explore",
    environment: "sky-island",
    objective: { id: "explore-island", text: "Jelajahi pulau — walk to the glowing marker", total: 1 },
    spawn: { position: [0, 0, 4], yaw: Math.PI },
    checkpoint: true,
    next: "first-message",
  },
  {
    id: "first-message",
    number: 3,
    chapter: "ch1",
    title: "The First Message",
    kind: "explore",
    environment: "sky-island",
    objective: { id: "read-first-message", text: "Sesuatu jatuh dari langit — open the letter", total: 1 },
    checkpoint: true,
    next: "follow-the-light",
  },
  {
    id: "follow-the-light",
    number: 4,
    chapter: "ch1",
    title: "Follow the Light",
    kind: "explore",
    environment: "sky-island",
    objective: { id: "collect-lights", text: "Kumpulkan cahaya", total: 3 },
    checkpoint: true,
    next: "first-portal",
  },
  {
    id: "first-portal",
    number: 5,
    chapter: "ch1",
    title: "The First Portal",
    kind: "explore",
    environment: "sky-island",
    objective: { id: "enter-portal", text: "Masuki portal di ujung pulau", total: 1 },
    checkpoint: true,
    next: "blooming-garden",
  },

  // ───────────── CHAPTER 02 — THE GARDEN OF MEMORIES ─────────────
  {
    id: "blooming-garden",
    number: 6,
    chapter: "ch2",
    title: "The Blooming Garden",
    kind: "explore",
    environment: "memory-garden",
    objective: { id: "reach-pavilion", text: "Jalan ke paviliun di tengah taman", total: 1 },
    spawn: { position: [0, 0, 22], yaw: Math.PI },
    checkpoint: true,
    next: "little-things",
  },
  {
    id: "little-things",
    number: 7,
    chapter: "ch2",
    title: "Little Things",
    kind: "explore",
    environment: "memory-garden",
    objective: { id: "collect-flowers", text: "Temukan bunga istimewa", total: 5 },
    checkpoint: true,
    next: "memory-in-the-air",
  },
  {
    id: "memory-in-the-air",
    number: 8,
    chapter: "ch2",
    title: "A Memory in the Air",
    kind: "explore",
    environment: "memory-garden",
    objective: { id: "view-memories", text: "Lihat kenangan yang melayang", total: 5 },
    checkpoint: true,
    next: "memory-tree",
  },
  {
    id: "memory-tree",
    number: 9,
    chapter: "ch2",
    title: "The Memory Tree",
    kind: "explore",
    environment: "memory-garden",
    objective: { id: "offer-flowers", text: "Letakkan bunga di akar Pohon Kenangan", total: 1 },
    checkpoint: true,
    next: "beautiful-moment",
  },
  {
    id: "beautiful-moment",
    number: 10,
    chapter: "ch2",
    title: "A Beautiful Moment",
    kind: "cinematic",
    environment: "memory-garden",
    hideHud: true,
    checkpoint: false,
    next: "silent-ocean",
  },

  // ───────────── CHAPTER 03 — THE OCEAN OF FEELINGS ─────────────
  {
    id: "silent-ocean",
    number: 11,
    chapter: "ch3",
    title: "The Silent Ocean",
    kind: "explore",
    environment: "ocean",
    objective: { id: "board-boat", text: "Naik ke perahu di dermaga", total: 1 },
    spawn: { position: [0, 0, 0], yaw: Math.PI },
    checkpoint: true,
    next: "sail-with-me",
  },
  {
    id: "sail-with-me",
    number: 12,
    chapter: "ch3",
    title: "Sail With Me",
    kind: "explore",
    environment: "ocean",
    objective: { id: "sail-to-light", text: "Berlayar ke cahaya di kejauhan", total: 1 },
    checkpoint: true,
    next: "message-bottles",
  },
  {
    id: "message-bottles",
    number: 13,
    chapter: "ch3",
    title: "The Message Bottles",
    kind: "explore",
    environment: "ocean",
    objective: { id: "collect-bottles", text: "Temukan botol pesan", total: 3 },
    checkpoint: true,
    next: "star-puzzle",
  },
  {
    id: "star-puzzle",
    number: 14,
    chapter: "ch3",
    title: "The Star Puzzle",
    kind: "puzzle",
    environment: "ocean",
    objective: { id: "solve-stars", text: "Berlayar ke Mercusuar Bintang dan hubungkan bintangnya", total: 1 },
    checkpoint: true,
    next: "beyond-horizon",
  },
  {
    id: "beyond-horizon",
    number: 15,
    chapter: "ch3",
    title: "Beyond the Horizon",
    kind: "cinematic",
    environment: "ocean",
    hideHud: true,
    checkpoint: false,
    next: "forgotten-castle",
  },

  // ───────────── CHAPTER 04 — THE CASTLE OF WORDS ─────────────
  {
    id: "forgotten-castle",
    number: 16,
    chapter: "ch4",
    title: "The Forgotten Castle",
    kind: "explore",
    environment: "castle",
    objective: { id: "reach-gate", text: "Cari pintu masuk kastil", total: 1 },
    spawn: { position: [0, 0, 26], yaw: Math.PI },
    checkpoint: true,
    next: "three-keys",
  },
  {
    id: "three-keys",
    number: 17,
    chapter: "ch4",
    title: "Three Keys",
    kind: "explore",
    environment: "castle",
    objective: { id: "collect-keys", text: "Temukan kunci ajaib", total: 3 },
    checkpoint: true,
    next: "unspoken-words",
  },
  {
    id: "unspoken-words",
    number: 18,
    chapter: "ch4",
    title: "The Unspoken Words",
    kind: "puzzle",
    environment: "castle",
    objective: { id: "unlock-fragments", text: "Buka pecahan surat dengan kunci", total: 3 },
    checkpoint: true,
    next: "heart-chamber",
  },
  {
    id: "heart-chamber",
    number: 19,
    chapter: "ch4",
    title: "The Heart Chamber",
    kind: "explore",
    environment: "castle",
    objective: { id: "reach-heart", text: "Masuki ruang hati", total: 1 },
    checkpoint: true,
    next: "letter-from-me",
  },
  {
    id: "letter-from-me",
    number: 20,
    chapter: "ch4",
    title: "A Letter From Me",
    kind: "letter",
    environment: "castle",
    hideHud: true,
    checkpoint: true,
    next: "final-path",
  },

  // ───────────── CHAPTER 05 — THE FINAL DESTINATION ─────────────
  {
    id: "final-path",
    number: 21,
    chapter: "ch5",
    title: "The Final Path",
    kind: "explore",
    environment: "final-garden",
    objective: { id: "follow-path", text: "Ikuti jalan yang bercahaya", total: 3 },
    spawn: { position: [0, 0, 30], yaw: Math.PI },
    checkpoint: true,
    next: "everything-we-found",
  },
  {
    id: "everything-we-found",
    number: 22,
    chapter: "ch5",
    title: "Everything We Found",
    kind: "cinematic",
    environment: "final-garden",
    checkpoint: true,
    next: "the-gift",
  },
  {
    id: "the-gift",
    number: 23,
    chapter: "ch5",
    title: "The Gift",
    kind: "explore",
    environment: "final-garden",
    objective: { id: "open-gift", text: "Buka hadiahnya", total: 1 },
    checkpoint: true,
    next: "the-question",
  },
  {
    id: "the-question",
    number: 24,
    chapter: "ch5",
    title: "The Question",
    kind: "cinematic",
    environment: "final-garden",
    hideHud: true,
    checkpoint: true,
    next: "new-beginning",
  },
  {
    id: "new-beginning",
    number: 25,
    chapter: "ch5",
    title: "Our New Beginning",
    kind: "ending",
    environment: "final-garden",
    hideHud: true,
    checkpoint: true,
    next: null,
  },
];

export const SCENES: Record<SceneId, SceneDefinition> = Object.fromEntries(
  defs.map((d) => [d.id, d]),
) as Record<SceneId, SceneDefinition>;

export const SCENE_ORDER: SceneId[] = defs.map((d) => d.id);

export function getScene(id: SceneId): SceneDefinition {
  return SCENES[id];
}

export function getChapterOfScene(id: SceneId): ChapterDefinition {
  return CHAPTERS[SCENES[id].chapter];
}

export function isFirstSceneOfChapter(id: SceneId): boolean {
  return CHAPTERS[SCENES[id].chapter].scenes[0] === id;
}

export function isLastSceneOfChapter(id: SceneId): boolean {
  const scenes = CHAPTERS[SCENES[id].chapter].scenes;
  return scenes[scenes.length - 1] === id;
}

export function nextChapter(id: ChapterId): ChapterId | null {
  const i = CHAPTER_ORDER.indexOf(id);
  return i >= 0 && i < CHAPTER_ORDER.length - 1 ? CHAPTER_ORDER[i + 1] : null;
}

export function sceneIndex(id: SceneId): number {
  return SCENE_ORDER.indexOf(id);
}

/** Total number of scenes — used by progress indicators. */
export const TOTAL_SCENES = defs.length;
