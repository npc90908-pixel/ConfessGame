/**
 * Height field and walkable regions of the castle grounds (pure functions,
 * shared by the environment, the headless preview and the tests).
 */
import { fx } from "@/game/engine/fx";
import { makeRollingHeight } from "@/game/objects/Terrain";
import { smoothstep } from "@/lib/math";
import { CASTLE } from "../../landmarks";
import { APPROACH, CH, COURTYARD, DOOR_HW, FACADE_Z, GATE_HW, HR, MOAT, OUTER_Z } from "./layout";

const flatSpots: Array<[number, number, number]> = [
  [CASTLE.spawn[0], CASTLE.spawn[2], 5],
  [0, OUTER_Z, 7],
  [0, FACADE_Z + 3, 7],
  [CASTLE.fountain[0], CASTLE.fountain[2], 7],
  ...CASTLE.keys.map((k) => [k[0], k[2], 3] as [number, number, number]),
];
const rolling = makeRollingHeight(44, 0.32, 0.09, flatSpots);

/** Ground height. Interiors are a flat stone floor, the moat is a dip, the rest rolls gently. */
export const getHeight = (x: number, z: number): number => {
  if (z < FACADE_Z + 0.5) return 0.15;
  // Moat: smooth banks, flat bottom; the bridge deck stays level.
  const inMoatBand = z > MOAT.minZ - 1.5 && z < MOAT.maxZ + 1.5;
  if (inMoatBand) {
    const onBridge = Math.abs(x) < 1.9;
    if (onBridge) return 0;
    const d = Math.min(z - (MOAT.minZ - 1.5), MOAT.maxZ + 1.5 - z);
    const k = smoothstep(0, 1.5, d);
    return rolling(x, z) * (1 - k) - MOAT.depth * k;
  }
  return rolling(x, z);
};

export const inCourtyard = (x: number, z: number) => x > COURTYARD.minX && x < COURTYARD.maxX && z > COURTYARD.minZ && z < COURTYARD.maxZ;
export const inApproach = (x: number, z: number) => Math.abs(x) < APPROACH.halfWidth && z > APPROACH.minZ && z < APPROACH.maxZ;
export const onBridge = (x: number, z: number) => Math.abs(x) < 1.35 && z >= OUTER_Z && z <= APPROACH.minZ + 0.01;
export const inOuterGateway = (x: number, z: number) => Math.abs(x) < GATE_HW - 0.5 && z >= COURTYARD.maxZ && z <= OUTER_Z + 1.6;
export const inGateway = (x: number, z: number) => Math.abs(x) < GATE_HW - 0.5 && z <= COURTYARD.minZ && z >= FACADE_Z - 3.5;
export const inChamber = (x: number, z: number) => Math.abs(x - CASTLE.chamberCenter[0]) < CH.w - 0.8 && Math.abs(z - CASTLE.chamberCenter[2]) < CH.d - 0.8;
export const inDoorway = (x: number, z: number) => Math.abs(x) < DOOR_HW - 0.3 && z <= CASTLE.chamberCenter[2] - CH.d + 0.8 && z >= CASTLE.heartRoom[2] + HR - 1.2;
export const inHeartRoom = (x: number, z: number) => Math.hypot(x - CASTLE.heartRoom[0], z - CASTLE.heartRoom[2]) < HR - 0.8;

/** Where the player may stand. Gates open as the chapter progresses (fx flags). */
export const isWalkable = (x: number, z: number): boolean => {
  if (inCourtyard(x, z) || inApproach(x, z) || onBridge(x, z) || inOuterGateway(x, z)) return true;
  if (inGateway(x, z)) return fx.castleGate > 0.6;
  if (inChamber(x, z)) return fx.castleGate > 0.6;
  if (inDoorway(x, z)) return fx.castleInnerDoor > 0.6;
  if (inHeartRoom(x, z)) return fx.castleInnerDoor > 0.6;
  return false;
};

/** Open ground inside the walls where trees/rocks may grow (off the avenue). */
export const inGrounds = (x: number, z: number) => inCourtyard(x, z) && Math.abs(x) > 6.5;
/** Forest outside the walls (never walkable). */
export const inForest = (x: number, z: number) => {
  const outsideWalls = Math.abs(x) > 36 || z > OUTER_Z + 3 || z < -78;
  const nearApproach = Math.abs(x) < APPROACH.halfWidth + 3 && z > MOAT.minZ - 2 && z < APPROACH.maxZ + 6;
  const inMoat = z > MOAT.minZ - 2 && z < MOAT.maxZ + 2 && Math.abs(x) < 50;
  return outsideWalls && !nearApproach && !inMoat;
};
