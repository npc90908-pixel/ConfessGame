/**
 * Export the castle layout to a scene JSON for scripts/preview/render.py.
 *
 *   npx tsx scripts/tools/preview-castle.mts /tmp/castle.json
 *   python3 scripts/preview/render.py /tmp/castle.json out.png --cam 0,40,110 --target 0,0,-10
 */
import { writeFileSync } from "node:fs";
import * as THREE from "three";
import { MODELS, type ModelId } from "../../src/config/models";
import { CASTLE } from "../../src/game/scenes/landmarks";
import { buildLayout, pathTiles, KEEP, HR, MOAT, OUTER_Z, FACADE_Z } from "../../src/game/scenes/environments/castle/layout";
import { getHeight, inGrounds, inForest } from "../../src/game/scenes/environments/castle/terrain";
import { scatter } from "../../src/game/objects/Flora";

const out = process.argv[2] ?? "/tmp/castle.json";
const layout = buildLayout();

const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();
const matrixOf = (position: [number, number, number], ry: number, scale: number | [number, number, number]) => {
  e.set(0, ry, 0);
  q.setFromEuler(e);
  v.set(...position);
  if (typeof scale === "number") sc.setScalar(scale);
  else sc.set(...scale);
  return m.compose(v, q, sc).toArray();
};

const glb = (id: ModelId) => `public${MODELS[id]}`;
const models: Array<{ glb: string; matrices: number[][] }> = [];
for (const [id, instances] of Object.entries(layout.pieces) as Array<[ModelId, typeof layout.pieces[ModelId]]>) {
  if (!instances) continue;
  models.push({ glb: glb(id), matrices: instances.map((i) => matrixOf(i.position, i.rotationY ?? 0, i.scale ?? 1)) });
}
const byModel = new Map<ModelId, number[][]>();
for (const p of layout.props) {
  const list = byModel.get(p.model) ?? [];
  list.push(matrixOf(p.position, p.ry ?? 0, p.scale ?? 1));
  byModel.set(p.model, list);
}
for (const [id, matrices] of byModel) models.push({ glb: glb(id), matrices });
models.push({ glb: glb("graveLightpostDouble"), matrices: layout.lanterns.map(([x, z, ry]) => matrixOf([x, getHeight(x, z), z], ry, 2)) });
models.push({ glb: glb("natPathStone"), matrices: pathTiles(getHeight).map((t) => matrixOf(t.position, t.rotationY ?? 0, t.scale ?? 1)) });

// Vegetation, same recipe as the environment.
const avoid: Array<[number, number, number]> = [CASTLE.spawn, CASTLE.gate, CASTLE.fountain, ...CASTLE.keys, [-18, 0, 8], [20, 0, -13]];
const courtyardTrees = scatter({ count: 26, seed: 401, area: inGrounds, bounds: [-31, 31, FACADE_Z, OUTER_Z], scale: [0.8, 1.2], avoid, avoidRadius: 7, spacing: 4 });
const forest = scatter({ count: 220, seed: 405, area: inForest, bounds: [-80, 80, -85, 75], scale: [0.9, 1.5], spacing: 3.5 });
const treeUrls: ModelId[] = ["natTreePineDefaultA", "natTreePineRoundA", "natTreePineTallADetailed", "natTreePineSmallA"];
treeUrls.forEach((id, k) => {
  const mine = [...courtyardTrees, ...forest].filter((_, i) => i % treeUrls.length === k);
  models.push({ glb: glb(id), matrices: mine.map((p) => matrixOf([p.x, getHeight(p.x, p.z), p.z], p.r, p.s * 2.9)) });
});

// Terrain + big volumes
const res = 2.5;
const minX = -80;
const maxX = 80;
const minZ = -85;
const maxZ = 75;
const heights: number[][] = [];
for (let z = minZ; z <= maxZ; z += res) {
  const row: number[] = [];
  for (let x = minX; x <= maxX; x += res) row.push(getHeight(x, z));
  heights.push(row);
}

const scene = {
  background: "#16122b",
  ambient: 0.45,
  light: [0.4, 1, 0.3],
  fog: { color: "#16122b", near: 90, far: 220 },
  heightfield: { minX, maxX, minZ, maxZ, heights, color: "#2f4a3e" },
  boxes: [
    { center: [0, KEEP.height / 2, (KEEP.minZ + KEEP.maxZ) / 2], size: [KEEP.halfW * 2, KEEP.height, KEEP.maxZ - KEEP.minZ], color: "#4a4466" },
    { center: [0, -0.55, (MOAT.minZ + MOAT.maxZ) / 2], size: [96, 0.05, MOAT.maxZ - MOAT.minZ], color: "#24406a" },
  ],
  spheres: [{ center: [CASTLE.heartRoom[0], 0, CASTLE.heartRoom[2]], radius: HR + 1.2, color: "#3a3552" }],
  models,
  markers: [
    { position: [...CASTLE.spawn], label: "spawn", color: "#ffffff" },
    { position: [CASTLE.gate[0], 0.5, CASTLE.gate[2]], label: "gate", color: "#f3d08a" },
    ...CASTLE.keys.map((k, i) => ({ position: [k[0], 1, k[2]], label: `key${i + 1}`, color: "#ffd700" })),
    ...CASTLE.pedestals.map((p, i) => ({ position: [p[0], 1, p[2]], label: `ped${i + 1}`, color: "#b9a7ff" })),
    { position: [...CASTLE.heart], label: "heart", color: "#ff4f8a" },
  ],
};
writeFileSync(out, JSON.stringify(scene));
const count = models.reduce((n, mm) => n + mm.matrices.length, 0);
console.log(`wrote ${out}: ${models.length} model groups, ${count} instances, ${layout.colliders.length} colliders`);
