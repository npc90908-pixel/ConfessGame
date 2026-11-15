import { GARDEN } from "../../src/game/scenes/landmarks";
import { BRIDGES, PATHS, getHeight, groundHeight, isWalkable, inWater, slopeAt, streamCenterZ, streamSurfaceY, NOOK_CENTER } from "../../src/game/scenes/environments/garden/terrain";

const fmt = (n: number) => n.toFixed(2);
const spots: Array<[string, number, number]> = [
  ["spawn", GARDEN.spawn[0], GARDEN.spawn[2]],
  ["pavilion", 0, 0],
  ["pavilion edge", 3.3, 0],
  ["ramp", 4.4, 0],
  ["tree", GARDEN.memoryTree[0], GARDEN.memoryTree[2]],
  ["treeOffer", GARDEN.treeOffer[0], GARDEN.treeOffer[2]],
  ["grove", GARDEN.memorySpots.grove[0], GARDEN.memorySpots.grove[2]],
  ["knoll", GARDEN.memorySpots.knoll[0], GARDEN.memorySpots.knoll[2]],
  ["nook", NOOK_CENTER[0], NOOK_CENTER[2]],
  ...GARDEN.flowers.map((f, i): [string, number, number] => [`flower${i + 1}`, f[0], f[2]]),
  ...GARDEN.secrets.map((f, i): [string, number, number] => [`secret${i + 1}`, f[0], f[2]]),
];
for (const [name, x, z] of spots) {
  console.log(`${name.padEnd(14)} h=${fmt(getHeight(x, z))} slope=${fmt(slopeAt(x, z))} walkable=${isWalkable(x, z)} water=${inWater(x, z)}`);
}
console.log("--- bridges");
for (const b of BRIDGES) {
  const zc = streamCenterZ(b.x);
  const line = [];
  for (let dz = -b.halfLength - 1; dz <= b.halfLength + 1; dz += 0.5) line.push(fmt(getHeight(b.x, zc + dz)));
  console.log(`bridge x=${b.x} zc=${fmt(zc)} surface=${fmt(streamSurfaceY(b.x))} bed=${fmt(groundHeight(b.x, zc))}\n  ${line.join(" ")}`);
}
console.log("--- stream profile at x=10");
{
  const zc = streamCenterZ(10);
  const line = [];
  for (let dz = -5; dz <= 5; dz += 0.5) line.push(fmt(getHeight(10, zc + dz)));
  console.log(`zc=${fmt(zc)} surface=${fmt(streamSurfaceY(10))}\n  ${line.join(" ")}`);
}
console.log("--- max slope scan (step 1)");
let worst = { x: 0, z: 0, s: 0 };
let nan = 0;
for (let x = -44; x <= 44; x += 1) for (let z = -44; z <= 44; z += 1) {
  const h = getHeight(x, z);
  if (!Number.isFinite(h)) nan++;
  const s = slopeAt(x, z);
  if (s > worst.s) worst = { x, z, s };
}
console.log("nan", nan, "worst slope", worst);
console.log("--- path slopes");
for (const [k, pts] of Object.entries(PATHS)) {
  let maxS = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.5);
    for (let j = 0; j <= n; j++) {
      const x = a[0] + ((b[0] - a[0]) * j) / n, z = a[2] + ((b[2] - a[2]) * j) / n;
      maxS = Math.max(maxS, slopeAt(x, z));
    }
  }
  console.log(k.padEnd(10), "max slope", fmt(maxS));
}
