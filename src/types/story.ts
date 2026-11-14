/**
 * Story / content types. Everything romantic lives in `src/config/story.ts`
 * and is validated against the zod schema in `src/config/schema.ts`.
 */

export type ChapterId = "ch1" | "ch2" | "ch3" | "ch4" | "ch5";

export type SceneId =
  // Chapter 01 — The Unknown World
  | "awakening"
  | "strange-place"
  | "first-message"
  | "follow-the-light"
  | "first-portal"
  // Chapter 02 — The Garden of Memories
  | "blooming-garden"
  | "little-things"
  | "memory-in-the-air"
  | "memory-tree"
  | "beautiful-moment"
  // Chapter 03 — The Ocean of Feelings
  | "silent-ocean"
  | "sail-with-me"
  | "message-bottles"
  | "star-puzzle"
  | "beyond-horizon"
  // Chapter 04 — The Castle of Words
  | "forgotten-castle"
  | "three-keys"
  | "unspoken-words"
  | "heart-chamber"
  | "letter-from-me"
  // Chapter 05 — The Final Destination
  | "final-path"
  | "everything-we-found"
  | "the-gift"
  | "the-question"
  | "new-beginning";

export type Language = "mix" | "id" | "en";
export type PuzzleDifficulty = "easy" | "normal" | "hard";

export interface DialogueLine {
  /** Speaker label shown above the text. Omit for narration. */
  speaker?: string;
  text: string;
}

export interface Letter {
  id: string;
  title: string;
  greeting?: string;
  /** Paragraphs of the letter body. */
  paragraphs: string[];
  signature?: string;
}

export interface Memory {
  id: string;
  title: string;
  caption: string;
  date?: string;
  /** Path under /public, e.g. "/memories/memory-01.webp" */
  image: string;
}

export interface BottleMessage {
  id: string;
  title: string;
  text: string;
}

export interface LetterFragment {
  id: string;
  /** The inventory key id required to unlock this fragment. */
  keyId: string;
  title: string;
  lines: string[];
}

export interface KeyDescription {
  id: string;
  name: string;
  description: string;
  color: string;
}

export interface ChapterText {
  id: ChapterId;
  number: number;
  title: string;
  subtitle: string;
  /** One or two sentences shown on the chapter title card. */
  intro: string;
  /** Short line shown on the chapter completion card. */
  outro: string;
  /** Accent colour for chapter cards & HUD. */
  accent: string;
}

export interface ThemeColors {
  midnight: string;
  lavender: string;
  rose: string;
  gold: string;
  ink: string;
}

export interface MusicConfig {
  menu: string;
  ch1: string;
  ch2: string;
  ch3: string;
  ch4: string;
  ch5: string;
  celebration: string;
  gentle: string;
}

export interface StoryConfig {
  senderName: string;
  recipientName: string;
  title: string;
  tagline: string;
  language: Language;
  /** 0.5 = slower & more cinematic, 2 = snappy. Scales typewriter & GSAP timelines. */
  animationSpeed: number;
  puzzleDifficulty: PuzzleDifficulty;
  theme: ThemeColors;
  music: MusicConfig;

  chapters: Record<ChapterId, ChapterText>;

  /** Short romantic one-liners used on loading screens & HUD moments. */
  romanticMessages: string[];

  dialogue: {
    awakening: DialogueLine[];
    strangePlace: DialogueLine[];
    afterFirstLetter: DialogueLine[];
    followTheLight: DialogueLine[];
    allLightsCollected: DialogueLine[];
    portal: DialogueLine[];
    bloomingGarden: DialogueLine[];
    littleThings: DialogueLine[];
    memoryInTheAir: DialogueLine[];
    memoryTree: DialogueLine[];
    beautifulMoment: DialogueLine[];
    silentOcean: DialogueLine[];
    sailWithMe: DialogueLine[];
    messageBottles: DialogueLine[];
    starPuzzle: DialogueLine[];
    starPuzzleSolved: DialogueLine[];
    beyondHorizon: DialogueLine[];
    forgottenCastle: DialogueLine[];
    threeKeys: DialogueLine[];
    chamberUnlocked: DialogueLine[];
    unspokenWords: DialogueLine[];
    heartChamber: DialogueLine[];
    finalPath: DialogueLine[];
    everythingWeFound: DialogueLine[];
    theGift: DialogueLine[];
    giftOpened: DialogueLine[];
  };

  letters: {
    firstMessage: Letter;
    fromMe: Letter;
    yesClosing: Letter;
    notYetClosing: Letter;
  };

  memories: Memory[];
  bottles: BottleMessage[];
  keys: KeyDescription[];
  fragments: LetterFragment[];

  proposal: {
    question: string;
    supportingText: string;
    yesLabel: string;
    notYetLabel: string;
  };

  endings: {
    yes: {
      headline: string;
      message: string;
    };
    notYet: {
      headline: string;
      message: string;
    };
  };

  summary: {
    title: string;
    subtitle: string;
  };
}
