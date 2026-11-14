import type { AmbientKey, SfxKey } from "@/types/game";

/**
 * Central asset manifest. Every file referenced by the game lives here so a
 * missing path is a single-place fix and nothing in the scene code hard-codes
 * URLs. All audio and sprite textures are ORIGINAL assets synthesised by the
 * scripts in `/scripts` (see README) — no third-party samples are used.
 */

const AUDIO_ROOT = "/audio";
const PARTICLE_ROOT = "/particles";
const TEXTURE_ROOT = "/textures";

/** Music loops. Keys are referenced by `story.music`. */
export const MUSIC_TRACKS = {
  "menu-theme": `${AUDIO_ROOT}/music/menu-theme`,
  "ch1-unknown-world": `${AUDIO_ROOT}/music/ch1-unknown-world`,
  "ch2-garden-of-memories": `${AUDIO_ROOT}/music/ch2-garden-of-memories`,
  "ch3-ocean-of-feelings": `${AUDIO_ROOT}/music/ch3-ocean-of-feelings`,
  "ch4-castle-of-words": `${AUDIO_ROOT}/music/ch4-castle-of-words`,
  "ch5-final-destination": `${AUDIO_ROOT}/music/ch5-final-destination`,
  celebration: `${AUDIO_ROOT}/music/celebration`,
  "gentle-ending": `${AUDIO_ROOT}/music/gentle-ending`,
} as const;

export type MusicTrackId = keyof typeof MUSIC_TRACKS;

export const AMBIENT_TRACKS: Record<AmbientKey, string> = {
  wind: `${AUDIO_ROOT}/ambient/wind`,
  garden: `${AUDIO_ROOT}/ambient/garden`,
  ocean: `${AUDIO_ROOT}/ambient/ocean`,
  castle: `${AUDIO_ROOT}/ambient/castle`,
  sky: `${AUDIO_ROOT}/ambient/sky`,
};

export const SFX: Record<SfxKey, string> = {
  "ui-hover": `${AUDIO_ROOT}/sfx/ui-hover`,
  "ui-click": `${AUDIO_ROOT}/sfx/ui-click`,
  "ui-open": `${AUDIO_ROOT}/sfx/ui-open`,
  "ui-close": `${AUDIO_ROOT}/sfx/ui-close`,
  collect: `${AUDIO_ROOT}/sfx/collect`,
  "collect-flower": `${AUDIO_ROOT}/sfx/collect-flower`,
  "quest-complete": `${AUDIO_ROOT}/sfx/quest-complete`,
  "chapter-complete": `${AUDIO_ROOT}/sfx/chapter-complete`,
  "portal-loop": `${AUDIO_ROOT}/sfx/portal-loop`,
  "portal-enter": `${AUDIO_ROOT}/sfx/portal-enter`,
  "letter-open": `${AUDIO_ROOT}/sfx/letter-open`,
  paper: `${AUDIO_ROOT}/sfx/paper`,
  typewriter: `${AUDIO_ROOT}/sfx/typewriter`,
  "bottle-open": `${AUDIO_ROOT}/sfx/bottle-open`,
  "star-connect": `${AUDIO_ROOT}/sfx/star-connect`,
  "puzzle-complete": `${AUDIO_ROOT}/sfx/puzzle-complete`,
  "key-pickup": `${AUDIO_ROOT}/sfx/key-pickup`,
  "door-unlock": `${AUDIO_ROOT}/sfx/door-unlock`,
  heartbeat: `${AUDIO_ROOT}/sfx/heartbeat`,
  "gift-open": `${AUDIO_ROOT}/sfx/gift-open`,
  firework: `${AUDIO_ROOT}/sfx/firework`,
  jump: `${AUDIO_ROOT}/sfx/jump`,
  footstep: `${AUDIO_ROOT}/sfx/footstep`,
  whoosh: `${AUDIO_ROOT}/sfx/whoosh`,
  bloom: `${AUDIO_ROOT}/sfx/bloom`,
  sparkle: `${AUDIO_ROOT}/sfx/sparkle`,
  "boat-loop": `${AUDIO_ROOT}/sfx/boat-loop`,
  "memory-open": `${AUDIO_ROOT}/sfx/memory-open`,
};

/** Howler accepts an ordered list and picks the first format the browser can play. */
export function audioSources(basePath: string): string[] {
  return [`${basePath}.ogg`, `${basePath}.mp3`];
}

/** Soft sprites used by the particle systems (WebP with alpha). */
export const PARTICLES = {
  glow: `${PARTICLE_ROOT}/glow.webp`,
  star: `${PARTICLE_ROOT}/star.webp`,
  petal: `${PARTICLE_ROOT}/petal.webp`,
  heart: `${PARTICLE_ROOT}/heart.webp`,
  spark: `${PARTICLE_ROOT}/spark.webp`,
  firefly: `${PARTICLE_ROOT}/firefly.webp`,
  cloud: `${PARTICLE_ROOT}/cloud.webp`,
  ring: `${PARTICLE_ROOT}/ring.webp`,
  leaf: `${PARTICLE_ROOT}/leaf.webp`,
} as const;

export type ParticleTextureId = keyof typeof PARTICLES;

export const TEXTURES = {
  noise: `${TEXTURE_ROOT}/noise.webp`,
  paper: `${TEXTURE_ROOT}/paper.webp`,
  waterNormal: `${TEXTURE_ROOT}/water-normal.webp`,
  caustics: `${TEXTURE_ROOT}/caustics.webp`,
} as const;

export const IMAGES = {
  ogImage: "/images/og-image.jpg",
  keyVisual: "/images/key-visual.webp",
} as const;

/** Everything that should be warmed before the title screen appears. */
export const BOOT_PRELOAD = {
  textures: [PARTICLES.glow, PARTICLES.star, PARTICLES.spark, TEXTURES.noise],
  audio: [MUSIC_TRACKS["menu-theme"], SFX["ui-click"], SFX["ui-hover"], SFX["ui-open"]],
};

/** Per-chapter texture warm-up lists used by the lazy loader. */
export const CHAPTER_TEXTURES: Record<string, string[]> = {
  ch1: [PARTICLES.glow, PARTICLES.star, PARTICLES.firefly, PARTICLES.cloud, PARTICLES.ring, TEXTURES.noise],
  ch2: [PARTICLES.petal, PARTICLES.glow, PARTICLES.firefly, PARTICLES.leaf, PARTICLES.ring, PARTICLES.spark],
  ch3: [TEXTURES.waterNormal, TEXTURES.noise, PARTICLES.glow, PARTICLES.star, PARTICLES.ring, PARTICLES.spark],
  ch4: [PARTICLES.glow, PARTICLES.spark, PARTICLES.cloud, PARTICLES.ring, PARTICLES.heart, TEXTURES.noise],
  ch5: [PARTICLES.cloud, PARTICLES.glow, PARTICLES.petal, PARTICLES.heart, PARTICLES.spark, PARTICLES.star],
};
