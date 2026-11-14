/**
 * Scalar "mood" values tweened by GSAP cinematics and read every frame by
 * environment components (lights, fog, shader uniforms). Keeping them as plain
 * numbers avoids React re-renders and guarantees a single animation owner.
 */
export const fx = {
  /** 0 = night ocean, 1 = golden-pink sunrise. */
  oceanSunrise: 0,
  /** 0 = sleeping memory tree, 1 = fully blooming garden. */
  gardenBloom: 0,
  /** 0 = sealed chamber, 1 = door open. */
  castleGate: 0,
  castleInnerDoor: 0,
  /** Crystal heart intensity multiplier. */
  heartGlow: 1,
  /** 0 = closed, 1 = lid open. */
  giftOpen: 0,
  /** Warms the final garden lighting for the question. */
  questionMood: 0,
  /** 1 = YES ending celebration active. */
  celebration: 0,
  /** Title screen reveal 0..1 (black → stars). */
  titleReveal: 0,
  /** Portal activation 0..1. */
  portalPower: 0,
  /** Player falling into portal 0..1. */
  portalEnter: 0,
};

export type FxKey = keyof typeof fx;

export function resetFx() {
  fx.oceanSunrise = 0;
  fx.gardenBloom = 0;
  fx.castleGate = 0;
  fx.castleInnerDoor = 0;
  fx.heartGlow = 1;
  fx.giftOpen = 0;
  fx.questionMood = 0;
  fx.celebration = 0;
  fx.portalPower = 0;
  fx.portalEnter = 0;
}
