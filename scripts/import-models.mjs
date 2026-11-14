#!/usr/bin/env node
/**
 * Copies the Kenney (CC0) glTF models the game uses into public/models and
 * regenerates `src/config/models.ts` so the manifest and the files on disk
 * can never drift apart.
 *
 * Source: the Kenney all-in-one library, e.g. the GitHub mirror
 *   https://github.com/shorepine/kenney  (3d/<kit>/<model>.glb)
 *
 *   node scripts/import-models.mjs /path/to/kenney/3d
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source || !existsSync(source)) {
  console.error("usage: node scripts/import-models.mjs <kenney-library>/3d");
  process.exit(1);
}

/** kit → model ids (file name without .glb). The TS key is derived from both. */
const SELECTION = {
  "mini-characters": ["character-female-a", "character-female-b", "character-female-c", "character-female-d", "character-female-e", "character-female-f", "character-male-a", "character-male-b", "character-male-c", "character-male-d", "character-male-e", "character-male-f"],
  castle: [
    "wall", "wall-half", "wall-corner", "wall-corner-half-tower", "wall-doorway", "wall-narrow", "wall-narrow-gate", "wall-narrow-stairs", "wall-narrow-stairs-rail", "wall-pillar", "wall-to-narrow", "wall-corner-slant",
    "gate", "metal-gate", "door", "bridge-straight", "bridge-straight-pillar", "bridge-draw",
    "tower-base", "tower-square-base", "tower-square-mid", "tower-square-mid-windows", "tower-square-mid-door", "tower-square-top", "tower-square-top-roof", "tower-square-top-roof-high", "tower-square-top-roof-high-windows", "tower-square-roof", "tower-square-arch", "tower-slant-roof", "tower-top",
    "tower-hexagon-base", "tower-hexagon-mid", "tower-hexagon-top", "tower-hexagon-roof",
    "flag", "flag-banner-long", "flag-pennant", "flag-wide", "stairs-stone", "stairs-stone-square", "rocks-large", "rocks-small", "tree-large", "tree-small",
  ],
  nature: [
    "tree_oak", "tree_default", "tree_detailed", "tree_fat", "tree_plateau", "tree_tall", "tree_thin", "tree_small", "tree_simple", "tree_cone",
    "tree_pineDefaultA", "tree_pineRoundA", "tree_pineTallA_detailed", "tree_pineSmallA", "tree_palmDetailedTall", "tree_palmBend",
    "tree_oak_fall", "tree_detailed_fall", "tree_fat_fall",
    "flower_purpleA", "flower_purpleB", "flower_purpleC", "flower_redA", "flower_redB", "flower_redC", "flower_yellowA", "flower_yellowB", "flower_yellowC",
    "plant_bush", "plant_bushDetailed", "plant_bushLarge", "grass", "grass_large", "grass_leafs", "mushroom_redGroup", "mushroom_tanGroup",
    "rock_largeA", "rock_largeC", "rock_tallB", "rock_tallD", "rock_smallFlatA", "stone_largeB", "stone_tallC", "stone_smallFlatA",
    "cliff_block_stone", "cliff_large_rock", "cliff_cornerLarge_rock", "cliff_top_stone",
    "bridge_stone", "bridge_woodRound", "fence_simple", "fence_planks", "log", "stump_round", "lily_large", "lily_small",
    "statue_column", "statue_obelisk", "statue_ring", "statue_block", "path_stone", "path_stoneCircle", "sign", "hanging_moss", "campfire_stones",
  ],
  "fantasy-town": ["fountain-round-detail", "fountain-square-detail", "hedge", "hedge-large", "hedge-gate", "hedge-curved", "lantern", "pillar-stone", "stairs-stone", "wall-arch", "wall-arch-top", "banner-red", "banner-green", "cart", "tree-high-round", "tree-crooked", "stall-bench", "windmill", "watermill", "overhang"],
  graveyard: ["lantern-candle", "lantern-glass", "lightpost-single", "lightpost-double", "lightpost-all", "fire-basket", "iron-fence", "iron-fence-border-gate", "iron-fence-border-column", "iron-fence-border-curve", "bench", "pillar-obelisk", "column-large", "altar-stone", "stone-wall", "stone-wall-curve", "stone-wall-column", "candle-multiple", "candle", "urn-round", "pine", "pine-crooked"],
  pirate: ["ship-small", "ship-medium", "boat-row-large", "boat-row-small", "structure-platform-dock", "structure-platform-dock-small", "structure-platform", "platform-planks", "palm-detailed-straight", "palm-detailed-bend", "barrel", "crate", "chest", "bottle", "bottle-large", "flag", "flag-pennant", "rocks-a", "rocks-b", "rocks-c", "rocks-sand-a", "rocks-sand-b", "tower-complete-small", "mast", "grass-patch", "patch-sand-foliage", "patch-grass-foliage", "tool-paddle"],
  platformer: ["heart", "key", "star", "chest", "flag", "flowers", "flowers-tall", "mushrooms", "coin-gold", "sign"],
  holiday: ["lantern", "lantern-hanging", "present-a-round", "present-b-cube", "present-a-cube", "present-b-round"],
};

const outRoot = join(root, "public", "models", "kenney");
const entries = [];
let copied = 0;
for (const [kit, names] of Object.entries(SELECTION)) {
  const kitDir = join(source, kit);
  const outKit = join(outRoot, kit);
  mkdirSync(outKit, { recursive: true });
  // Shared palette atlas, referenced relatively by the GLBs.
  const texDir = join(kitDir, "Textures");
  if (existsSync(texDir)) {
    mkdirSync(join(outKit, "Textures"), { recursive: true });
    for (const file of readdirSync(texDir)) {
      copyFileSync(join(texDir, file), join(outKit, "Textures", file));
      copied++;
    }
  }
  for (const name of names) {
    const src = join(kitDir, `${name}.glb`);
    if (!existsSync(src)) throw new Error(`missing in library: ${kit}/${name}.glb`);
    copyFileSync(src, join(outKit, `${name}.glb`));
    copied++;
    entries.push({ kit, name });
  }
}

const camel = (s) => s.replace(/[-_]+(\w)/g, (_, c) => c.toUpperCase());
const KIT_PREFIX = { "mini-characters": "char", castle: "castle", nature: "nat", "fantasy-town": "town", graveyard: "grave", pirate: "pirate", platformer: "plat", holiday: "holiday" };
const key = (kit, name) => camel(`${KIT_PREFIX[kit] ?? kit}-${name.replace(/^character-/, "")}`);

const ts = `/**
 * GENERATED by scripts/import-models.mjs — do not edit by hand.
 *
 * glTF models from Kenney's CC0 asset library (https://kenney.nl), served
 * from public/models/kenney/<kit>/. Keep every URL in this one place so a
 * missing file is a single-place fix (tests/models.test.ts checks them all).
 */
export const MODEL_ROOT = "/models/kenney";

export const MODELS = {
${entries.map(({ kit, name }) => `  ${key(kit, name)}: \`\${MODEL_ROOT}/${kit}/${name}.glb\`,`).join("\n")}
} as const;

export type ModelId = keyof typeof MODELS;
export type ModelUrl = (typeof MODELS)[ModelId];

/** Kits whose GLBs reference an external palette atlas (Textures/colormap.png). */
export const MODEL_TEXTURE_KITS = ${JSON.stringify(Object.keys(SELECTION).filter((kit) => existsSync(join(source, kit, "Textures"))))} as const;

export const CHARACTER_MODELS = {
${SELECTION["mini-characters"].map((name) => `  "${name}": MODELS.${key("mini-characters", name)},`).join("\n")}
} as const;

export type CharacterModelId = keyof typeof CHARACTER_MODELS;
`;
writeFileSync(join(root, "src", "config", "models.ts"), ts);
writeFileSync(
  join(outRoot, "LICENSE.txt"),
  `All models in this folder are from Kenney's game-asset library (https://kenney.nl),
released under Creative Commons Zero (CC0) — https://creativecommons.org/publicdomain/zero/1.0/
Kits used: ${Object.keys(SELECTION).join(", ")}.
Support the artist: https://kenney.nl/donate
`,
);
console.log(`copied ${copied} files for ${entries.length} models → public/models/kenney, wrote src/config/models.ts`);
