// @vitest-environment jsdom
/**
 * Headless scene exporter (a tool, not a regression test).
 *
 * Mounts one environment with the React Three test renderer, advances a few
 * frames and dumps every rendered mesh (world-space matrices + geometry, or a
 * GLB reference for Kenney models) to JSON that `scripts/preview/render.py`
 * can rasterise without a GPU. It also samples the walkable height function
 * against a vertical raycast of the rendered geometry so gaps between what
 * the player stands on and what is drawn show up as numbers.
 *
 *   EXPORT_ENV=memory-garden npx vitest run tests/tools/export-scene.test.tsx
 *   python3 scripts/preview/render.py /tmp/scene-memory-garden.json out.png --cam 0,14,30 --target 0,0,0
 *
 * Skipped unless EXPORT_ENV is set.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import React from "react";
import * as THREE from "three";
import { mkdirSync, writeFileSync } from "node:fs";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { getWorld } from "@/game/engine/world";
import type { EnvironmentId, SceneId } from "@/types/game";

vi.mock("@react-three/drei", () => import("../helpers/drei").then((m) => m.mockDrei()));
vi.mock("@/game/systems/audio/AudioManager", () => {
  const noop = () => undefined;
  return { audio: new Proxy({}, { get: () => noop }) };
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TARGET = (process.env.EXPORT_ENV ?? "") as EnvironmentId | "";
const SCENE = process.env.EXPORT_SCENE as SceneId | undefined;
const OUT_DIR = process.env.EXPORT_DIR ?? "/tmp";

const ENVIRONMENTS: Record<EnvironmentId, { load: () => Promise<{ default: React.ComponentType }>; scene: SceneId }> = {
  "sky-island": { load: () => import("@/game/scenes/environments/SkyIsland"), scene: "follow-the-light" },
  "memory-garden": { load: () => import("@/game/scenes/environments/MemoryGarden"), scene: "memory-in-the-air" },
  ocean: { load: () => import("@/game/scenes/environments/OceanWorld"), scene: "message-bottles" },
  castle: { load: () => import("@/game/scenes/environments/CastleWorld"), scene: "unspoken-words" },
  "final-garden": { load: () => import("@/game/scenes/environments/FinalGarden"), scene: "the-gift" },
};

beforeAll(() => {
  vi.stubGlobal("AudioContext", class { state = "suspended"; resume() { return Promise.resolve(); } });
  if (!("ResizeObserver" in globalThis)) vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, media: "", onchange: null, dispatchEvent: () => false });
  }
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

interface ExportGeometry {
  positions: number[];
  indices: number[] | null;
}
interface ExportMesh {
  geometry: string;
  matrices: number[][];
  color: string;
  double: boolean;
  name: string;
}
interface ExportModel {
  glb: string;
  matrices: number[][];
}

function colorOf(material: THREE.Material | THREE.Material[]): string {
  const m = Array.isArray(material) ? material[0] : material;
  const c = (m as THREE.MeshStandardMaterial).color;
  if (c && c.isColor) {
    const e = (m as THREE.MeshStandardMaterial).emissive;
    const ei = (m as THREE.MeshStandardMaterial).emissiveIntensity ?? 0;
    const out = c.clone();
    if (e && ei > 0.5) out.lerp(e, Math.min(0.6, ei * 0.2));
    return `#${out.getHexString()}`;
  }
  return "#b48cff";
}

function modelUrlOf(obj: THREE.Object3D): string | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (typeof cur.userData?.url === "string") return cur.userData.url;
    cur = cur.parent;
  }
  return null;
}

function publicPath(url: string) {
  return url.startsWith("/") ? `public${url}` : url;
}

describe.skipIf(!TARGET)("scene export", () => {
  it(`exports ${TARGET}`, async () => {
    const env = ENVIRONMENTS[TARGET as EnvironmentId];
    expect(env, `unknown EXPORT_ENV "${TARGET}"`).toBeTruthy();
    useProgressStore.setState({ sceneId: SCENE ?? env.scene });
    useUIStore.getState().setPhase("playing");
    const { default: Environment } = await env.load();

    const renderer = await ReactThreeTestRenderer.create(
      <React.Suspense fallback={null}>
        <Environment />
      </React.Suspense>,
    );
    await renderer.advanceFrames(10, 1 / 60);
    const world = getWorld();
    expect(world?.id).toBe(TARGET);

    const scene = renderer.scene.instance as unknown as THREE.Scene;
    scene.updateMatrixWorld(true);

    const geometries: Record<string, ExportGeometry> = {};
    const meshes: ExportMesh[] = [];
    const models = new Map<string, ExportModel>();
    const raycastTargets: THREE.Object3D[] = [];
    const tmp = new THREE.Matrix4();
    const addModel = (url: string, matrix: THREE.Matrix4) => {
      const glb = publicPath(url);
      let m = models.get(glb);
      if (!m) {
        m = { glb, matrices: [] };
        models.set(glb, m);
      }
      m.matrices.push(matrix.toArray());
    };

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible || (obj as THREE.Points).isPoints) return;
      let hidden = false;
      for (let p: THREE.Object3D | null = obj; p; p = p.parent) if (!p.visible) hidden = true;
      if (hidden) return;
      const geo = mesh.geometry;
      const pos = geo.getAttribute("position");
      if (!pos) return;
      if (!geo.boundingSphere) geo.computeBoundingSphere();
      const scale = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld);
      const radius = (geo.boundingSphere?.radius ?? 0) * Math.max(scale.x, scale.y, scale.z);
      if (radius > 400) return; // sky domes & fog shells

      const inst = mesh as THREE.InstancedMesh;
      const url = modelUrlOf(obj) ?? (typeof geo.userData?.url === "string" ? geo.userData.url : null);
      if (inst.isInstancedMesh) {
        const count = inst.count;
        const mats: number[][] = [];
        for (let i = 0; i < count; i++) {
          inst.getMatrixAt(i, tmp);
          tmp.premultiply(mesh.matrixWorld);
          if (url) addModel(url, tmp);
          else mats.push(tmp.toArray());
        }
        if (!url && mats.length) {
          geometries[geo.uuid] ??= { positions: Array.from(pos.array as Float32Array), indices: geo.index ? Array.from(geo.index.array as Uint16Array | Uint32Array) : null };
          meshes.push({ geometry: geo.uuid, matrices: mats, color: colorOf(mesh.material), double: (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).side === THREE.DoubleSide, name: obj.name });
          raycastTargets.push(mesh);
        }
        return;
      }
      if (url) {
        // The GLB root carries the transform the real model should get.
        let root: THREE.Object3D = obj;
        for (let p: THREE.Object3D | null = obj; p; p = p.parent) if (typeof p.userData?.url === "string") root = p;
        if (root === obj || !root.userData.__exported) {
          root.userData.__exported = true;
          addModel(url, root.matrixWorld);
        }
        return; // props are not walkable surfaces
      }
      geometries[geo.uuid] ??= { positions: Array.from(pos.array as Float32Array), indices: geo.index ? Array.from(geo.index.array as Uint16Array | Uint32Array) : null };
      meshes.push({ geometry: geo.uuid, matrices: [mesh.matrixWorld.toArray()], color: colorOf(mesh.material), double: (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).side === THREE.DoubleSide, name: obj.name });
      raycastTargets.push(mesh);
    });

    // Walkable-vs-rendered surface probe along a grid.
    const ray = new THREE.Raycaster();
    ray.firstHitOnly = false;
    const probe: Array<{ x: number; z: number; walk: number; drawn: number | null; above: number | null; name?: string }> = [];
    const extent = Number(process.env.EXPORT_PROBE_EXTENT ?? 12);
    const step = Number(process.env.EXPORT_PROBE_STEP ?? 1);
    const cx = Number(process.env.EXPORT_PROBE_X ?? 0);
    const cz = Number(process.env.EXPORT_PROBE_Z ?? 0);
    for (let x = cx - extent; x <= cx + extent; x += step) {
      for (let z = cz - extent; z <= cz + extent; z += step) {
        if (!world!.isWalkable(x, z)) continue;
        const walk = world!.getHeight(x, z);
        ray.set(new THREE.Vector3(x, walk + 3, z), new THREE.Vector3(0, -1, 0));
        ray.far = 60;
        const hits = ray.intersectObjects(raycastTargets, false).filter((h) => h.point.y <= walk + 2.6);
        // closest drawn surface to the walk height, and anything solid the player would stand inside
        let top: THREE.Intersection | undefined;
        for (const h of hits) if (!top || Math.abs(h.point.y - walk) < Math.abs(top.point.y - walk)) top = h;
        let above: THREE.Intersection | undefined;
        for (const h of hits) if (h.point.y > walk + 0.12 && h.point.y <= walk + 1.2 && (!above || h.point.y > above.point.y)) above = h;
        probe.push({ x, z, walk: +walk.toFixed(3), drawn: top ? +top.point.y.toFixed(3) : null, above: above ? +above.point.y.toFixed(3) : null, name: (above ?? top)?.object.name || (above ?? top)?.object.type });
      }
    }

    // Placement audit: Kenney models have their origin at the base, so the
    // translation of every instance should sit on the walkable surface.
    const placement: Array<{ glb: string; x: number; z: number; y: number; ground: number; delta: number }> = [];
    for (const m of models.values()) {
      for (const mat of m.matrices) {
        const x = mat[12];
        const y = mat[13];
        const z = mat[14];
        if (!world!.isWalkable(x, z)) continue;
        const ground = world!.getHeight(x, z);
        const delta = y - ground;
        if (delta > 0.2 || delta < -0.35) placement.push({ glb: m.glb.split("/").slice(-2).join("/"), x: +x.toFixed(1), z: +z.toFixed(1), y: +y.toFixed(2), ground: +ground.toFixed(2), delta: +delta.toFixed(2) });
      }
    }

    const out = {
      background: "#07051a",
      ambient: 0.4,
      light: [0.4, 0.8, 0.3],
      geometries,
      meshes,
      models: Array.from(models.values()),
      markers: [
        { position: [world!.respawn[0], world!.getHeight(world!.respawn[0], world!.respawn[2]) + 0.2, world!.respawn[2]], label: "spawn", color: "#ffff00" },
      ],
      probe,
    };
    mkdirSync(OUT_DIR, { recursive: true });
    const file = `${OUT_DIR}/scene-${TARGET}.json`;
    writeFileSync(file, JSON.stringify(out));
    const gaps = probe.filter((p) => p.drawn === null || Math.abs(p.drawn - p.walk) > 0.12);
    const buried = probe.filter((p) => p.above !== null);
    console.log(`exported ${meshes.length} mesh groups, ${models.size} model types, ${raycastTargets.length} raycast targets → ${file}`);
    console.log(`probe: ${probe.length} samples, ${gaps.length} with no drawn surface within 0.12 of the walk height, ${buried.length} where a solid surface sits above the walk height`);
    for (const g of gaps.slice(0, 40)) console.log(`  gap at (${g.x}, ${g.z}): walk=${g.walk} drawn=${g.drawn} ${g.name ?? ""}`);
    for (const g of buried.slice(0, 40)) console.log(`  buried at (${g.x}, ${g.z}): walk=${g.walk} solid above=${g.above} ${g.name ?? ""}`);
    console.log(`placement: ${placement.length} model instances floating (>0.2) or sunk (<-0.35) relative to the walk surface`);
    for (const p of placement.slice(0, 40)) console.log(`  ${p.glb} at (${p.x}, ${p.z}): y=${p.y} ground=${p.ground} delta=${p.delta}`);
    await renderer.unmount();
  }, 120_000);
});
