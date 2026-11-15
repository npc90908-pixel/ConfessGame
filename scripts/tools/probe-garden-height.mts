import { makeRollingHeight } from "../../src/game/objects/Terrain";
import { makeNoise2D } from "../../src/lib/math";

const flatSpots: Array<[number, number, number]> = [[0, 0, 7], [0, -19, 6], [0, 22, 3]];
const getHeight = makeRollingHeight(22, 0.4, 0.09, flatSpots);
const { noise, fbm } = makeNoise2D(22);
console.log("noise(0,0)=", noise(0, 0), "fbm(0,0)=", fbm(0, 0));
console.log("getHeight(0,0)=", getHeight(0, 0));
let bad = 0; let min = Infinity; let max = -Infinity;
const size = 72, segs = 96;
for (let i = 0; i <= segs; i++) for (let j = 0; j <= segs; j++) {
  const x = -size / 2 + (i * size) / segs; const z = -size / 2 + (j * size) / segs;
  const h = getHeight(x, z);
  if (!Number.isFinite(h)) { bad++; if (bad < 10) console.log("NaN at", x, z); }
  else { min = Math.min(min, h); max = Math.max(max, h); }
}
console.log({ bad, min, max });
// profile across the centre
const row: string[] = [];
for (let x = -10; x <= 10; x += 1) row.push(getHeight(x, 0).toFixed(3));
console.log("profile z=0:", row.join(" "));
const row2: string[] = [];
for (let z = -10; z <= 10; z += 1) row2.push(getHeight(0, z).toFixed(3));
console.log("profile x=0:", row2.join(" "));
// noise at grid points
console.log("noise at ints:", [0, 1, 2, 3].map((v) => noise(v, v).toFixed(3)).join(" "), "noise(0.5,0.5)=", noise(0.5, 0.5));
