import type { ChapterId, SceneId } from "./story";

export type { ChapterId, SceneId };

/** High level application state machine. */
export type GamePhase =
  | "boot" // initial asset loading
  | "title" // opening screen (Scene 01)
  | "playing" // 3D world, player has control
  | "ending"; // after the answer has been given

export type EnvironmentId =
  | "sky-island"
  | "memory-garden"
  | "ocean"
  | "castle"
  | "final-garden";

export type SceneKind = "cinematic" | "explore" | "puzzle" | "letter" | "ending";

export type MusicKey =
  | "menu"
  | "ch1"
  | "ch2"
  | "ch3"
  | "ch4"
  | "ch5"
  | "celebration"
  | "gentle";

export type AmbientKey = "wind" | "garden" | "ocean" | "castle" | "sky";

export type SfxKey =
  | "ui-hover"
  | "ui-click"
  | "ui-open"
  | "ui-close"
  | "collect"
  | "collect-flower"
  | "quest-complete"
  | "chapter-complete"
  | "portal-loop"
  | "portal-enter"
  | "letter-open"
  | "paper"
  | "typewriter"
  | "bottle-open"
  | "star-connect"
  | "puzzle-complete"
  | "key-pickup"
  | "door-unlock"
  | "heartbeat"
  | "gift-open"
  | "firework"
  | "jump"
  | "footstep"
  | "whoosh"
  | "bloom"
  | "sparkle"
  | "boat-loop"
  | "memory-open";

export type ItemCategory =
  | "light"
  | "flower"
  | "memory"
  | "bottle"
  | "star"
  | "key"
  | "fragment"
  | "letter"
  | "gift"
  | "keepsake";

export type IconName =
  | "light"
  | "flower"
  | "photo"
  | "bottle"
  | "star"
  | "key"
  | "scroll"
  | "letter"
  | "gift"
  | "heart"
  | "pause"
  | "play"
  | "settings"
  | "bag"
  | "volume"
  | "mute"
  | "close"
  | "arrow-right"
  | "arrow-left"
  | "hand"
  | "compass"
  | "sparkles"
  | "replay"
  | "map"
  | "jump"
  | "skip"
  | "check"
  | "info";

export interface InventoryItem {
  id: string;
  category: ItemCategory;
  name: string;
  description: string;
  icon: IconName;
  /** Accent colour for the inventory tile. */
  color: string;
  /** Chapter in which the item is found. */
  chapter: ChapterId;
}

export interface Objective {
  id: string;
  text: string;
  /** Number of steps needed to complete (1 for simple "go here" objectives). */
  total: number;
}

export interface SpawnPoint {
  position: [number, number, number];
  /** Facing yaw in radians. */
  yaw: number;
}

export interface SceneDefinition {
  id: SceneId;
  /** 1-based scene number (01..25). */
  number: number;
  chapter: ChapterId;
  title: string;
  kind: SceneKind;
  environment: EnvironmentId;
  objective?: Objective;
  spawn?: SpawnPoint;
  /** Hide the gameplay HUD for the whole scene (cinematics, letters, endings). */
  hideHud?: boolean;
  /** Whether entering this scene writes a checkpoint. */
  checkpoint: boolean;
  next: SceneId | null;
}

export interface ChapterDefinition {
  id: ChapterId;
  number: number;
  environment: EnvironmentId;
  scenes: SceneId[];
  music: MusicKey;
  ambient: AmbientKey;
}

export type PuzzleState = "locked" | "active" | "solved";

export type Answer = "yes" | "not-yet";

export type QualityTier = "low" | "medium" | "high";

export interface Toast {
  id: number;
  title: string;
  description?: string;
  icon?: IconName;
  color?: string;
}

/** Discriminated union describing which overlay is currently open. */
export type Overlay =
  | { type: "intro" }
  | { type: "pause" }
  | { type: "settings"; from: "pause" | "title" }
  | { type: "inventory" }
  | { type: "gallery" }
  | { type: "memory"; memoryId: string }
  | { type: "letter"; letterId: string; closable?: boolean }
  | { type: "bottle"; bottleId: string }
  | { type: "fragment"; fragmentId: string }
  | { type: "puzzle" }
  | { type: "summary" }
  | { type: "chapter-intro"; chapterId: ChapterId }
  | { type: "chapter-complete"; chapterId: ChapterId }
  | { type: "controls"; mode: "walk" | "boat" }
  | { type: "proposal" }
  | { type: "ending"; answer: Answer };

export interface DialogueRequest {
  lines: { speaker?: string; text: string }[];
  /** Resolve when the player dismissed the final line. */
  onComplete?: () => void;
}
