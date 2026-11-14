/**
 * Colour palette shared by the UI (Tailwind tokens in globals.css) and the
 * three.js scenes. Keep these in sync with `@theme` in `src/app/globals.css`.
 */
export const palette = {
  midnight950: "#06040f",
  midnight900: "#0b0718",
  midnight800: "#140d2b",
  midnight700: "#1c1240",
  midnight600: "#2a1b5e",
  midnight500: "#3b2a7a",

  lavender100: "#efe9ff",
  lavender200: "#d7ccff",
  lavender300: "#b9a7ff",
  lavender400: "#9d8df1",
  lavender500: "#7f6ad8",

  rose100: "#ffe3ee",
  rose200: "#f9c6d9",
  rose300: "#ff9fc4",
  rose400: "#ff8fb8",
  rose500: "#ff6fa3",
  rose600: "#e9548c",

  gold100: "#fff6dd",
  gold200: "#fff1c9",
  gold300: "#f8dfa3",
  gold400: "#f3d08a",
  gold500: "#e8b86d",

  ink: "#f6f1ff",
  inkMuted: "#b8aed6",

  // Environment specific
  grass: "#4a8f6a",
  grassLight: "#7cc48f",
  grassDark: "#2f6a4d",
  soil: "#4b3350",
  rock: "#5a4b7a",
  rockDark: "#2d2446",
  bark: "#5a3a4a",
  barkLight: "#7a5468",
  blossom: "#ffb7d5",
  blossomLight: "#ffe0ec",
  leaf: "#6fbf8f",
  water: "#0f2a5a",
  waterDeep: "#071734",
  waterFoam: "#cfe8ff",
  stone: "#8a7fa8",
  stoneDark: "#4c4468",
  wood: "#7a5234",
  woodLight: "#a8764d",
  cloud: "#efe6ff",
  sunrise: "#ffb08a",
  sunriseSky: "#ff8fb8",
} as const;

export type PaletteKey = keyof typeof palette;
