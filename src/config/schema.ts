import { z } from "zod";
import type { StoryConfig } from "@/types/story";

const hex = z.string().regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Expected a hex colour");

const dialogueLine = z.object({
  speaker: z.string().min(1).optional(),
  text: z.string().min(1),
});

const letter = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  greeting: z.string().optional(),
  paragraphs: z.array(z.string().min(1)).min(1),
  signature: z.string().optional(),
});

const chapterIds = ["ch1", "ch2", "ch3", "ch4", "ch5"] as const;

const chapterText = z.object({
  id: z.enum(chapterIds),
  number: z.number().int().min(1).max(5),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  intro: z.string().min(1),
  outro: z.string().min(1),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const storySchema = z.object({
  senderName: z.string().min(1),
  recipientName: z.string().min(1),
  title: z.string().min(1),
  tagline: z.string().min(1),
  language: z.enum(["mix", "id", "en"]),
  animationSpeed: z.number().min(0.5).max(2),
  puzzleDifficulty: z.enum(["easy", "normal", "hard"]),
  theme: z.object({
    midnight: hex,
    lavender: hex,
    rose: hex,
    gold: hex,
    ink: hex,
  }),
  music: z.object({
    menu: z.string(),
    ch1: z.string(),
    ch2: z.string(),
    ch3: z.string(),
    ch4: z.string(),
    ch5: z.string(),
    celebration: z.string(),
    gentle: z.string(),
  }),
  chapters: z.object({
    ch1: chapterText,
    ch2: chapterText,
    ch3: chapterText,
    ch4: chapterText,
    ch5: chapterText,
  }),
  romanticMessages: z.array(z.string().min(1)).min(1),
  dialogue: z.record(z.string(), z.array(dialogueLine).min(1)),
  letters: z.object({
    firstMessage: letter,
    fromMe: letter,
    yesClosing: letter,
    notYetClosing: letter,
  }),
  memories: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        caption: z.string().min(1),
        date: z.string().optional(),
        image: z.string().startsWith("/"),
      }),
    )
    .min(1),
  bottles: z
    .array(z.object({ id: z.string(), title: z.string(), text: z.string().min(1) }))
    .length(3, "The ocean chapter expects exactly three bottles"),
  keys: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        color: hex,
      }),
    )
    .length(3, "The castle chapter expects exactly three keys"),
  fragments: z
    .array(
      z.object({
        id: z.string(),
        keyId: z.string(),
        title: z.string(),
        lines: z.array(z.string().min(1)).min(1),
      }),
    )
    .length(3, "The castle chapter expects exactly three letter fragments"),
  proposal: z.object({
    question: z.string().min(1),
    supportingText: z.string().min(1),
    yesLabel: z.string().min(1),
    notYetLabel: z.string().min(1),
  }),
  endings: z.object({
    yes: z.object({ headline: z.string(), message: z.string() }),
    notYet: z.object({ headline: z.string(), message: z.string() }),
  }),
  summary: z.object({ title: z.string(), subtitle: z.string() }),
});

/**
 * Validates the story configuration. Throws a readable error listing every
 * problem so that a typo in `story.ts` is caught immediately in development.
 */
export function validateStory(config: StoryConfig): StoryConfig {
  const result = storySchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid story configuration (src/config/story.ts):\n${issues}`);
  }

  // Cross-reference checks that zod alone cannot express.
  const keyIds = new Set(config.keys.map((k) => k.id));
  for (const fragment of config.fragments) {
    if (!keyIds.has(fragment.keyId)) {
      throw new Error(
        `Invalid story configuration: fragment "${fragment.id}" references unknown key "${fragment.keyId}"`,
      );
    }
  }
  return config;
}
