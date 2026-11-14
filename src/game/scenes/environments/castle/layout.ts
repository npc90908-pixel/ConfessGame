/**
 * Chapter 4 — the Castle of Words, as data.
 *
 * Everything that is *placed* (kit pieces, props, colliders, walkable
 * regions) lives here so the React environment only renders, and the
 * headless preview (`scripts/tools/preview-castle.mts`) and the smoke tests
 * can reason about the very same numbers.
 *
 * Coordinates are metres. The player walks north (−z) from the forest spawn,
 * over the moat bridge, through the outer gatehouse, across the courtyard to
 * the sealed gate of the keep.
 */
import { MODELS, type ModelId } from "@/config/models";
import { box, circle, type Collider } from "@/game/engine/world";
import type { Instance } from "@/game/objects/Model";
import { CASTLE } from "../../landmarks";

/** Castle kit pieces are 1 m cubes; this makes them castle-sized. */
export const S = 3;
/** Nature/graveyard/town props use a smaller scale. */
export const PROP = 2.2;

export const FACADE_Z = CASTLE.facadeZ; // −27
export const OUTER_Z = CASTLE.outerGate[2]; // 33
export const SIDE_X = 33;
export const COURTYARD = { minX: -SIDE_X + 2.3, maxX: SIDE_X - 2.3, minZ: FACADE_Z + 1.6, maxZ: OUTER_Z - 1.6 };
export const GATE_HW = 3; // half width of both 6 m gate openings
export const MOAT = { minZ: 36.5, maxZ: 41.5, depth: 1.7 };
export const APPROACH = { halfWidth: 6, minZ: MOAT.maxZ, maxZ: 57 };
export const KEEP = { halfW: 16, minZ: -50, maxZ: FACADE_Z, height: 12 };
export const CH = CASTLE.chamberHalf;
export const HR = CASTLE.heartRoomRadius;
export const DOOR_HW = 1.8;

/* -------------------------------------------------------------------------- */
/*  Piece list builders                                                       */
/* -------------------------------------------------------------------------- */

export type PieceMap = Partial<Record<ModelId, Instance[]>>;

const H: Partial<Record<ModelId, number>> = {
  castleTowerSquareBase: 1,
  castleTowerSquareMid: 1,
  castleTowerSquareMidWindows: 1,
  castleTowerSquareMidDoor: 1,
  castleTowerSquareTop: 0.3,
  castleTowerSquareTopRoof: 1,
  castleTowerSquareTopRoofHigh: 1.35,
  castleTowerSquareTopRoofHighWindows: 1.35,
  castleTowerSquareRoof: 0.33,
  castleTowerHexagonBase: 1,
  castleTowerHexagonMid: 0.46,
  castleTowerHexagonTop: 0.13,
  castleTowerHexagonRoof: 0.83,
  castleWall: 1,
};

function makeBuilder() {
  const pieces: PieceMap = {};
  const put = (model: ModelId, x: number, y: number, z: number, ry = 0, scale: number | [number, number, number] = S) => {
    (pieces[model] ??= []).push({ position: [x, y, z], rotationY: ry, scale });
  };
  /** Place `model` every `pitch` metres between two points (inclusive of both ends). */
  const row = (model: ModelId, from: [number, number], to: [number, number], y: number, ry = 0, skip?: (x: number, z: number) => boolean) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const n = Math.max(1, Math.round(len / S));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const x = from[0] + (to[0] - from[0]) * t;
      const z = from[1] + (to[1] - from[1]) * t;
      if (skip?.(x, z)) continue;
      put(model, x, y, z, ry);
    }
  };
  /** Stack pieces vertically from `y0`, returning the top height (metres). */
  const stack = (x: number, z: number, models: ModelId[], ry = 0, y0 = 0) => {
    let y = y0;
    for (const m of models) {
      put(m, x, y, z, ry);
      y += (H[m] ?? 1) * S;
    }
    return y;
  };
  return { pieces, put, row, stack };
}

const SQUARE_TOWER_TALL: ModelId[] = ["castleTowerSquareBase", "castleTowerSquareBase", "castleTowerSquareMidWindows", "castleTowerSquareMid", "castleTowerSquareTop", "castleTowerSquareTopRoofHighWindows"];
const SQUARE_TOWER: ModelId[] = ["castleTowerSquareBase", "castleTowerSquareBase", "castleTowerSquareMidWindows", "castleTowerSquareTop", "castleTowerSquareTopRoofHigh"];
const HEX_TOWER: ModelId[] = ["castleTowerHexagonBase", "castleTowerHexagonMid", "castleTowerHexagonMid", "castleTowerHexagonMid", "castleTowerHexagonTop", "castleTowerHexagonRoof"];
const HEX_TOWER_TALL: ModelId[] = ["castleTowerHexagonBase", "castleTowerHexagonMid", "castleTowerHexagonMid", "castleTowerHexagonMid", "castleTowerHexagonMid", "castleTowerHexagonMid", "castleTowerHexagonTop", "castleTowerHexagonRoof"];
const GREAT_TOWER: ModelId[] = ["castleTowerSquareBase", "castleTowerSquareBase", "castleTowerSquareMidWindows", "castleTowerSquareMid", "castleTowerSquareMidWindows", "castleTowerSquareMid", "castleTowerSquareTop", "castleTowerSquareTopRoofHighWindows"];

/** All castle-kit pieces (walls, towers, flags, bridge…) grouped per model. */
export function buildCastle(): { pieces: PieceMap; flagTops: Array<[number, number, number]> } {
  const b = makeBuilder();
  const flagTops: Array<[number, number, number]> = [];
  const nearGate = (x: number) => Math.abs(x) < GATE_HW + S; // opening + flanking towers

  // Outer curtain wall ---------------------------------------------------
  b.row("castleWall", [-SIDE_X, OUTER_Z], [SIDE_X, OUTER_Z], 0, 0, nearGate);
  b.row("castleWall", [-SIDE_X, OUTER_Z], [-SIDE_X, FACADE_Z], 0, Math.PI / 2);
  b.row("castleWall", [SIDE_X, OUTER_Z], [SIDE_X, FACADE_Z], 0, Math.PI / 2);
  for (const [x, z] of [
    [-SIDE_X, OUTER_Z],
    [SIDE_X, OUTER_Z],
  ] as Array<[number, number]>) {
    const top = b.stack(x, z, HEX_TOWER);
    flagTops.push([x, top, z]);
  }

  // Outer gatehouse (always open) ------------------------------------------
  for (const sx of [-1, 1]) {
    const top = b.stack(sx * (GATE_HW + S / 2), OUTER_Z, SQUARE_TOWER);
    flagTops.push([sx * (GATE_HW + S / 2), top, OUTER_Z]);
    b.put("castleTowerSquareBase", sx * 1.5, 2 * S, OUTER_Z);
    b.put("castleWall", sx * 1.5, 3 * S, OUTER_Z);
  }
  // Raised portcullis under the lintel.
  b.put("castleMetalGate", 0, 1.45 * S, OUTER_Z - 0.2, Math.PI / 2, [S, 1.6 * S, 2.85 * S]);

  // Keep facade ------------------------------------------------------------
  const facadeHalf = 21;
  const skipTowers = (x: number) => nearGate(x);
  b.row("castleTowerSquareBase", [-facadeHalf, FACADE_Z], [facadeHalf, FACADE_Z], 0, 0, skipTowers);
  b.row("castleTowerSquareBase", [-facadeHalf, FACADE_Z], [facadeHalf, FACADE_Z], S, 0, skipTowers);
  b.row("castleTowerSquareMidWindows", [-facadeHalf, FACADE_Z], [facadeHalf, FACADE_Z], 2 * S, 0, skipTowers);
  b.row("castleWall", [-facadeHalf, FACADE_Z], [facadeHalf, FACADE_Z], 3 * S, 0, skipTowers);
  // Lintel over the sealed gate.
  for (const sx of [-1, 1]) {
    b.put("castleTowerSquareBase", sx * 1.5, 2 * S, FACADE_Z);
    b.put("castleWall", sx * 1.5, 3 * S, FACADE_Z);
    const top = b.stack(sx * (GATE_HW + S / 2), FACADE_Z, SQUARE_TOWER_TALL);
    flagTops.push([sx * (GATE_HW + S / 2), top, FACADE_Z]);
    b.stack(sx * facadeHalf, FACADE_Z, HEX_TOWER_TALL);
    b.row("castleWall", [sx * facadeHalf, FACADE_Z], [sx * SIDE_X, FACADE_Z], 0);
    b.stack(sx * SIDE_X, FACADE_Z, HEX_TOWER);
    // Hanging banners either side of the gate.
    b.put("castleFlagBannerLong", sx * 9, 1.4 * S, FACADE_Z + S / 2 + 0.05, -Math.PI / 2, S * 1.2);
    b.put("castleFlagBannerLong", sx * 15, 1.4 * S, FACADE_Z + S / 2 + 0.05, -Math.PI / 2, S * 1.2);
  }
  // Keep roofline: battlements around the body, great tower rising from the roof.
  const roofY = KEEP.height - S;
  b.row("castleWall", [-KEEP.halfW + 1.5, KEEP.minZ], [KEEP.halfW - 1.5, KEEP.minZ], roofY);
  b.row("castleWall", [-KEEP.halfW + 1.5, KEEP.minZ], [-KEEP.halfW + 1.5, KEEP.maxZ - 3], roofY, Math.PI / 2);
  b.row("castleWall", [KEEP.halfW - 1.5, KEEP.minZ], [KEEP.halfW - 1.5, KEEP.maxZ - 3], roofY, Math.PI / 2);
  const greatTop = b.stack(0, -40, GREAT_TOWER, 0, KEEP.height);
  flagTops.push([0, greatTop, -40]);

  // Flags on every tower top.
  for (const [x, y, z] of flagTops) b.put("castleFlag", x, y - 0.1, z, 0, S * 0.9);

  // Moat bridge (nature stone bridge, deck roughly at ground level).
  b.put("natBridgeStone", 0, -0.75, MOAT.minZ + 1.4, 0, 3.3);
  b.put("natBridgeStone", 0, -0.75, MOAT.maxZ - 1.4, 0, 3.3);

  return { pieces: b.pieces, flagTops };
}

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

export interface Prop {
  model: ModelId;
  position: [number, number, number];
  ry?: number;
  scale?: number | [number, number, number];
  collider?: Collider;
}

const FOUNTAIN = CASTLE.fountain;
const WEST_GARDEN: [number, number] = [-18, 8];
const EAST_GARDEN: [number, number] = [20, -13];

/** Hedge rectangle with gaps in the middle of each side. */
function hedgeRing(cx: number, cz: number, hw: number, hd: number): Prop[] {
  const out: Prop[] = [];
  const seg = 2; // hedge-large is 1 m long × 0.4 thick, scaled ×2
  const along = (fixed: number, from: number, to: number, horizontal: boolean) => {
    const n = Math.round((to - from) / seg);
    for (let i = 0; i < n; i++) {
      const c = from + (i + 0.5) * seg;
      const mid = (from + to) / 2;
      if (Math.abs(c - mid) < seg) continue; // entrance gap
      const x = horizontal ? c : fixed;
      const z = horizontal ? fixed : c;
      // hedge-large occupies x∈[0.1,0.5] of its unit → shift so it is centred on the line.
      const ry = horizontal ? Math.PI / 2 : 0;
      const offX = horizontal ? 0 : -0.6;
      const offZ = horizontal ? 0.6 : 0;
      out.push({ model: "townHedgeLarge", position: [x + offX, 0, z + offZ], ry, scale: 2, collider: box(x, z, horizontal ? 1 : 0.45, horizontal ? 0.45 : 1) });
    }
  };
  along(cz - hd, cx - hw, cx + hw, true);
  along(cz + hd, cx - hw, cx + hw, true);
  along(cx - hw, cz - hd, cz + hd, false);
  along(cx + hw, cz - hd, cz + hd, false);
  // Corner urns: round the outside corners so the player slides past instead of wedging.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = cx + sx * hw;
      const z = cz + sz * hd;
      out.push({ model: "graveUrnRound", position: [x, 0, z], scale: PROP, collider: circle(x, z, 0.85) });
    }
  }
  return out;
}

export function buildProps(): Prop[] {
  const props: Prop[] = [];

  // Fountain plaza
  props.push({ model: "townFountainRoundDetail", position: [FOUNTAIN[0], 0, FOUNTAIN[2]], scale: S, collider: circle(FOUNTAIN[0], FOUNTAIN[2], 3.3) });
  const benchR = 5.6;
  for (const [i, a] of [0, Math.PI / 2, Math.PI, -Math.PI / 2].entries()) {
    const x = FOUNTAIN[0] + Math.sin(a) * benchR;
    const z = FOUNTAIN[2] + Math.cos(a) * benchR;
    props.push({ model: "graveBench", position: [x, 0, z], ry: a + Math.PI, scale: PROP, collider: box(x, z, i % 2 === 0 ? 1 : 0.6, i % 2 === 0 ? 0.6 : 1) });
  }
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    const x = FOUNTAIN[0] + Math.sin(a) * 6.2;
    const z = FOUNTAIN[2] + Math.cos(a) * 6.2;
    props.push({ model: "graveUrnRound", position: [x, 0, z], scale: PROP, collider: circle(x, z, 0.5) });
  }

  // West parterre garden with a ring statue
  props.push(...hedgeRing(WEST_GARDEN[0], WEST_GARDEN[1], 7, 5));
  props.push({ model: "natStatueRing", position: [WEST_GARDEN[0], 0, WEST_GARDEN[1]], scale: S, collider: circle(WEST_GARDEN[0], WEST_GARDEN[1], 1.1) });
  for (const sx of [-1, 1]) {
    props.push({ model: "natStatueObelisk", position: [WEST_GARDEN[0] + sx * 4.5, 0, WEST_GARDEN[1] - 3], scale: PROP, collider: circle(WEST_GARDEN[0] + sx * 4.5, WEST_GARDEN[1] - 3, 0.5) });
    props.push({ model: "natStatueObelisk", position: [WEST_GARDEN[0] + sx * 4.5, 0, WEST_GARDEN[1] + 3], scale: PROP, collider: circle(WEST_GARDEN[0] + sx * 4.5, WEST_GARDEN[1] + 3, 0.5) });
  }

  // East garden: a small shrine of columns around the third key's steps
  props.push(...hedgeRing(EAST_GARDEN[0], EAST_GARDEN[1], 5, 4));
  for (const [dx, dz] of [
    [-3, -2.5],
    [3, -2.5],
    [-3, 2.5],
    [3, 2.5],
  ]) {
    const x = EAST_GARDEN[0] + dx;
    const z = EAST_GARDEN[1] + dz;
    props.push({ model: "natStatueColumn", position: [x, 0, z], scale: S, collider: circle(x, z, 0.55) });
  }
  props.push({ model: "graveAltarStone", position: [EAST_GARDEN[0], 0, EAST_GARDEN[1] - 3], scale: PROP, collider: box(EAST_GARDEN[0], EAST_GARDEN[1] - 3, 1.2, 0.8) });

  // Carts, barrels and crates near the outer gate (life in the courtyard)
  props.push({ model: "townCart", position: [-9, 0, 27], ry: 0.5, scale: PROP, collider: box(-9, 27, 1.6, 1.1, 0.5) });
  props.push({ model: "pirateBarrel", position: [9, 0, 28], scale: PROP, collider: circle(9, 28, 0.75) });
  props.push({ model: "pirateBarrel", position: [10.6, 0, 27.2], scale: PROP * 0.9, collider: circle(10.6, 27.2, 0.7) });
  props.push({ model: "pirateCrate", position: [11.5, 0, 29], ry: 0.3, scale: PROP, collider: box(11.5, 29, 0.9, 0.9, 0.3) });

  // Fire baskets flanking both gates
  for (const sx of [-1, 1]) {
    props.push({ model: "graveFireBasket", position: [sx * 4.2, 0, OUTER_Z - 3.2], scale: PROP, collider: circle(sx * 4.2, OUTER_Z - 3.2, 0.6) });
    props.push({ model: "graveFireBasket", position: [sx * 4.2, 0, FACADE_Z + 3.2], scale: PROP, collider: circle(sx * 4.2, FACADE_Z + 3.2, 0.6) });
    props.push({ model: "graveFireBasket", position: [sx * 4.2, 0, APPROACH.maxZ - 2], scale: PROP, collider: circle(sx * 4.2, APPROACH.maxZ - 2, 0.6) });
  }

  // Chamber: columns + banners + fire
  for (const [x, z] of [
    [-9, -32],
    [9, -32],
    [-9, -44],
    [9, -44],
  ]) {
    props.push({ model: "graveColumnLarge", position: [x, 0, z], scale: 5, collider: circle(x, z, 1.2) });
  }
  for (const sx of [-1, 1]) {
    props.push({ model: "graveFireBasket", position: [sx * (CH.w - 1.5), 0, -30.5], scale: PROP, collider: circle(sx * (CH.w - 1.5), -30.5, 0.6) });
    props.push({ model: "graveFireBasket", position: [sx * (CH.w - 1.5), 0, -45.5], scale: PROP, collider: circle(sx * (CH.w - 1.5), -45.5, 0.6) });
    // Columns framing the inner door
    props.push({ model: "graveColumnLarge", position: [sx * 3.4, 0, CASTLE.innerDoor[2] + 1.2], scale: 4, collider: circle(sx * 3.4, CASTLE.innerDoor[2] + 1.2, 1) });
    props.push({ model: "castleFlagBannerLong", position: [sx * 7, 1.2 * S, CASTLE.chamberCenter[2] - CH.d + 0.3], ry: Math.PI / 2, scale: S });
  }

  // Heart room: ring of columns with candles
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = CASTLE.heartRoom[0] + Math.cos(a) * (HR - 2);
    const z = CASTLE.heartRoom[2] + Math.sin(a) * (HR - 2);
    props.push({ model: "natStatueColumn", position: [x, 0, z], scale: 5, collider: circle(x, z, 0.9) });
    props.push({ model: "graveCandleMultiple", position: [x - Math.cos(a) * 1.3, 0, z - Math.sin(a) * 1.3], scale: S });
  }

  return props;
}

/** Positions of the courtyard lamp posts (double lanterns along the avenue). */
export function lanternPositions(): Array<[number, number, number, number]> {
  const out: Array<[number, number, number, number]> = [];
  for (const z of [27, 17, 7, -3, -13, -23]) {
    out.push([-4.6, z, Math.PI / 2, 0]);
    out.push([4.6, z, -Math.PI / 2, 0]);
  }
  // Approach path
  for (const z of [47, 54]) {
    out.push([-3.8, z, Math.PI / 2, 1]);
    out.push([3.8, z, -Math.PI / 2, 1]);
  }
  return out;
}

/** Stone avenue tiles from the spawn to the sealed gate. */
export function pathTiles(getHeight: (x: number, z: number) => number): Instance[] {
  const tiles: Instance[] = [];
  for (let z = APPROACH.maxZ - 1.5; z > FACADE_Z + 1.5; z -= 3) {
    if (z > MOAT.minZ - 1 && z < MOAT.maxZ + 1) continue; // bridge deck
    for (const x of [-1.5, 1.5]) {
      tiles.push({ position: [x, getHeight(x, z) + 0.02, z], rotationY: (Math.round(z) + x) % 2 === 0 ? 0 : Math.PI, scale: [3, 1, 5.2] });
    }
  }
  return tiles;
}

/* -------------------------------------------------------------------------- */
/*  Everything together                                                       */
/* -------------------------------------------------------------------------- */

export interface CastleLayout {
  pieces: PieceMap;
  props: Prop[];
  colliders: Collider[];
  lanterns: Array<[number, number, number, number]>;
}

export function buildLayout(): CastleLayout {
  const { pieces } = buildCastle();
  const props = buildProps();
  const lanterns = lanternPositions();
  const colliders: Collider[] = [
    ...props.flatMap((p) => (p.collider ? [p.collider] : [])),
    ...lanterns.map(([x, z]) => circle(x, z, 0.4)),
    ...CASTLE.pedestals.map((p) => circle(p[0], p[2], 0.8)),
    circle(CASTLE.heart[0], CASTLE.heart[2], 1.8),
  ];
  return { pieces, props, colliders, lanterns };
}

/** Model URLs used by the layout — for preloading. */
export function layoutModelUrls(layout: CastleLayout): string[] {
  const ids = new Set<ModelId>([...(Object.keys(layout.pieces) as ModelId[]), ...layout.props.map((p) => p.model)]);
  return [...ids].map((id) => MODELS[id]);
}
