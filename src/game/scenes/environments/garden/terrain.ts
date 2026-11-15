import * as THREE from "three";
import { GARDEN } from "@/game/scenes/landmarks";
import { bump, channel, makeRollingHeight, plateau } from "@/game/objects/Terrain";
import { makeNoise2D, smoothstep } from "@/lib/math";

/**
 * Garden of Memories — one continuous height field for everything the player
 * can stand on. Structures that used to be separate meshes sitting on the
 * grass (the pavilion plinth) are part of this function, so the walk height,
 * the collision clamp, the camera ground clamp and the drawn ground all agree.
 */

export const H = GARDEN.halfSize;

/* ---------------------------------- stream --------------------------------- */

export const STREAM = {
  /** Mean z of the centreline (south of the pavilion, north of the spawn lawn). */
  baseZ: 19,
  /** Half width of the water. */
  halfWidth: 1.7,
  /** Width of the sloping bank beyond the water. */
  bank: 1.4,
  depth: 0.55,
  /** Water surface relative to the bank top. */
  surface: -0.18,
};

export function streamCenterZ(x: number) {
  return STREAM.baseZ + 3.0 * Math.sin(x * 0.085) + 1.2 * Math.sin(x * 0.21 + 1.7);
}

/** Vertical distance to the centreline — accurate enough for a gentle meander. */
export function streamDistance(x: number, z: number) {
  return Math.abs(z - streamCenterZ(x));
}

export function inWater(x: number, z: number) {
  return streamDistance(x, z) < STREAM.halfWidth + 0.45;
}

/** Water surface height along the stream (flat across its width). */
export function streamSurfaceY(x: number) {
  return landHeight(x, streamCenterZ(x)) + STREAM.surface;
}

/* --------------------------------- bridges --------------------------------- */

export interface Bridge {
  x: number;
  /** Half width of the deck (walkable). */
  halfWidth: number;
  /** Half length of the deck along z, measured from the stream centreline. */
  halfLength: number;
}

export const BRIDGES: Bridge[] = [
  { x: 0, halfWidth: 1.6, halfLength: STREAM.halfWidth + STREAM.bank + 0.9 },
  { x: -24, halfWidth: 1.3, halfLength: STREAM.halfWidth + STREAM.bank + 0.9 },
  { x: 26, halfWidth: 1.3, halfLength: STREAM.halfWidth + STREAM.bank + 0.9 },
];

export function bridgeAt(x: number, z: number): Bridge | null {
  for (const b of BRIDGES) {
    if (Math.abs(x - b.x) <= b.halfWidth && Math.abs(z - streamCenterZ(b.x)) <= b.halfLength) return b;
  }
  return null;
}

/* ------------------------------- structures -------------------------------- */

export const PAVILION = { flatRadius: 3.4, rampRadius: 5.4, height: 0.45 };
export const GATE_STEP = { flatRadius: 2.4, rampRadius: 3.8, height: 0.12 };
export const TREE_MOUND = { flatRadius: 7, rampRadius: 12.5, height: 0.7 };
export const HILLS = [
  { x: -31, z: 31, r: 13, h: 1.5 },
  { x: 31, z: -31, r: 12, h: 1.2 },
  { x: 33, z: 10, r: 9, h: 0.6 },
];

/** Hidden hedge nook in the south-east corner: [x, z, halfW, halfD] walls. */
export const NOOK_WALLS: Array<[number, number, number, number]> = [
  [36, 27, 6, 0.6],
  [36, 39, 6, 0.6],
  [42, 33, 0.6, 6.6],
  [30, 33, 0.6, 3.6],
];
export const NOOK_CENTER: [number, number, number] = [37, 0, 33];
/** The two gaps in the nook's west wall (walk in here). */
export const NOOK_ENTRANCES: Array<[number, number, number]> = [
  [30, 0, 28.5],
  [30, 0, 37.5],
];

const flatSpots: Array<[number, number, number]> = [
  [0, 0, 7],
  [GARDEN.memoryTree[0], GARDEN.memoryTree[2], 13],
  [GARDEN.spawn[0], GARDEN.spawn[2], 4],
  ...BRIDGES.map((b): [number, number, number] => [b.x, streamCenterZ(b.x), 6]),
];
const rolling = makeRollingHeight(22, 0.45, 0.07, flatSpots);
const { noise } = makeNoise2D(23);

/** Everything except the bridges and the stream cut. */
export function landHeight(x: number, z: number) {
  let h = rolling(x, z);
  for (const hill of HILLS) h += hill.h * bump(Math.hypot(x - hill.x, z - hill.z), hill.r);
  h += PAVILION.height * plateau(Math.hypot(x, z), PAVILION.flatRadius, PAVILION.rampRadius);
  h += GATE_STEP.height * plateau(Math.hypot(x - GARDEN.spawn[0], z - GARDEN.spawn[2]), GATE_STEP.flatRadius, GATE_STEP.rampRadius);
  const dt = Math.hypot(x - GARDEN.memoryTree[0], z - GARDEN.memoryTree[2]);
  h += TREE_MOUND.height * plateau(dt, TREE_MOUND.flatRadius, TREE_MOUND.rampRadius);
  return h;
}

/** Terrain with the stream carved, without bridge decks (used for banks/beds). */
export function groundHeight(x: number, z: number) {
  const h = landHeight(x, z);
  // Carve the stream: full depth in the water, easing back up across the bank.
  const cut = 1 - channel(streamDistance(x, z), STREAM.halfWidth, STREAM.bank);
  return h - STREAM.depth * cut;
}

const deckCache = new Map<Bridge, number>();
function deckHeight(b: Bridge) {
  let d = deckCache.get(b);
  if (d === undefined) {
    const zc = streamCenterZ(b.x);
    const a = landHeight(b.x, zc - b.halfLength);
    const c = landHeight(b.x, zc + b.halfLength);
    d = Math.max(a, c) + 0.1;
    deckCache.set(b, d);
  }
  return d;
}

/** Walk/draw height. Bridges blend from the banks up onto a flat deck. */
export function getHeight(x: number, z: number) {
  const ground = groundHeight(x, z);
  const b = bridgeAt(x, z);
  if (!b) return ground;
  const dz = Math.abs(z - streamCenterZ(b.x));
  const onDeck = 1 - smoothstep(b.halfLength - 1.1, b.halfLength, dz);
  return ground + (deckHeight(b) - ground) * onDeck;
}

/** The whole garden inside the hedges is walkable — the stream is shallow enough to wade. */
export const isWalkable = (x: number, z: number) => Math.abs(x) < H - 1 && Math.abs(z) < H - 1;

/** Scatter helper: lawn away from hubs, the stream and the bridges. */
export const inGarden = (x: number, z: number) =>
  Math.abs(x) < H - 1.5 && Math.abs(z) < H - 1.5 && Math.hypot(x, z) > 6.5 && streamDistance(x, z) > STREAM.halfWidth + STREAM.bank + 0.6 && bridgeAt(x, z) === null;

/* --------------------------------- regions --------------------------------- */

export const GROVE = { x: -28, z: -28, r: 13 };
export const inGrove = (x: number, z: number) => Math.hypot(x - GROVE.x, z - GROVE.z) < GROVE.r;
export const inKnoll = (x: number, z: number) => Math.hypot(x - HILLS[1].x, z - HILLS[1].z) < HILLS[1].r;
export const inNook = (x: number, z: number) => x > 29 && x < 43 && z > 26 && z < 40;
export const nearHedge = (x: number, z: number) => Math.abs(x) > H - 7 || Math.abs(z) > H - 7;

/* -------------------------------- colouring -------------------------------- */

const GRASS = new THREE.Color("#2f6a48");
const GRASS_LIGHT = new THREE.Color("#3f7f52");
const MEADOW = new THREE.Color("#4a8a4e");
const STONE = new THREE.Color("#7a7290");
const SAND = new THREE.Color("#8a8070");
const BED = new THREE.Color("#2b3b5a");
const MOUND = new THREE.Color("#3a6a52");

export const MEADOWS = [
  { x: -26, z: -4, r: 11 },
  { x: 26, z: 2, r: 11 },
  { x: 24, z: -26, r: 8 },
];

export const inMeadow = (x: number, z: number) => MEADOWS.some((m) => Math.hypot(x - m.x, z - m.z) < m.r * 0.8);

/** Per-vertex tint for the ground mesh. */
export function colorAt(x: number, z: number, _h: number, out: THREE.Color) {
  const n = noise(x * 0.11, z * 0.11) * 0.5 + 0.5;
  out.copy(GRASS).lerp(GRASS_LIGHT, n);
  for (const m of MEADOWS) out.lerp(MEADOW, 0.7 * bump(Math.hypot(x - m.x, z - m.z), m.r));
  const dt = Math.hypot(x - GARDEN.memoryTree[0], z - GARDEN.memoryTree[2]);
  out.lerp(MOUND, 0.6 * plateau(dt, TREE_MOUND.flatRadius, TREE_MOUND.rampRadius));
  // stone ramp around the pavilion and the gate step
  out.lerp(STONE, plateau(Math.hypot(x, z), PAVILION.flatRadius + 0.2, PAVILION.rampRadius + 0.6));
  out.lerp(STONE, plateau(Math.hypot(x - GARDEN.spawn[0], z - GARDEN.spawn[2]), GATE_STEP.flatRadius, GATE_STEP.rampRadius + 0.4));
  // sandy banks → dark stream bed
  const d = streamDistance(x, z);
  out.lerp(SAND, 1 - smoothstep(STREAM.halfWidth + 0.2, STREAM.halfWidth + STREAM.bank + 0.6, d));
  out.lerp(BED, 1 - smoothstep(STREAM.halfWidth - 0.3, STREAM.halfWidth + 0.5, d));
}

/* --------------------------------- routes ---------------------------------- */

type P = [number, number, number];
const bz = (x: number) => streamCenterZ(x);

/** Stepping-stone routes (also used by tests as guaranteed-walkable lines). */
export const PATHS: Record<string, P[]> = {
  mainSouth: [
    [0, 0, GARDEN.spawn[2] - 2.8],
    [0, 0, bz(0) + 5.2],
  ],
  mainNorth: [
    [0, 0, bz(0) - 5.2],
    [0, 0, 6.2],
  ],
  toTree: [
    [0, 0, -6.5],
    [0, 0, GARDEN.treeOffer[2] + 2.5],
  ],
  west: [
    [-5.5, 0, 1.5],
    [-16, 0, 2],
    [-24, 0, bz(-24) - 5.5],
  ],
  westLawn: [
    [-24, 0, bz(-24) + 5.5],
    [-28, 0, 30],
  ],
  grove: [
    [-16, 0, -2],
    [-24, 0, -18],
    [-27, 0, -26],
  ],
  east: [
    [5.5, 0, 1.5],
    [16, 0, 2],
    [26, 0, bz(26) - 5.5],
  ],
  eastLawn: [
    [26, 0, bz(26) + 5.5],
    [25, 0, 31],
  ],
  knoll: [
    [16, 0, -2],
    [26, 0, -20],
    [30, 0, -29],
  ],
};

/** A reusable "is this spot reasonably level" probe for placement sanity. */
export function slopeAt(x: number, z: number, step = 0.5) {
  const dx = (getHeight(x + step, z) - getHeight(x - step, z)) / (2 * step);
  const dz = (getHeight(x, z + step) - getHeight(x, z - step)) / (2 * step);
  return Math.hypot(dx, dz);
}
