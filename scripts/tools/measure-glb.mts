import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const noTextures = { name: "NO_TEXTURES", loadTexture: () => Promise.resolve(null) } as unknown as Parameters<GLTFLoader["register"]>[0] extends (p: infer P) => infer R ? R : never;

async function load(path: string) {
  const loader = new GLTFLoader();
  loader.register(() => noTextures as never);
  const buf = readFileSync(path);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF>((resolve, reject) => loader.parse(ab, "", resolve, reject));
}

const bbox = (obj: THREE.Object3D) => {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  obj.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) {
      const sm = o as THREE.SkinnedMesh;
      sm.computeBoundingBox();
      const b = sm.boundingBox!.clone().applyMatrix4(sm.matrixWorld);
      box.union(b);
    } else if ((o as THREE.Mesh).isMesh) {
      box.expandByObject(o);
    }
  });
  return box;
};

for (const path of process.argv.slice(2)) {
  const gltf = await load(path);
  const scene = gltf.scene;
  const clips = gltf.animations.map((a) => `${a.name}(${a.duration.toFixed(2)}s)`);
  const rest = bbox(scene);
  let idle = rest;
  const clip = gltf.animations.find((a) => a.name === "idle") ?? gltf.animations.find((a) => a.name === "static");
  if (clip) {
    const mixer = new THREE.AnimationMixer(scene);
    mixer.clipAction(clip).play();
    mixer.update(0.01);
    idle = bbox(scene);
  }
  const f = (b: THREE.Box3) => `min=${b.min.toArray().map((v) => v.toFixed(2))} max=${b.max.toArray().map((v) => v.toFixed(2))} size=${b.getSize(new THREE.Vector3()).toArray().map((v) => v.toFixed(2))}`;
  const meshes: string[] = [];
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { const m = o as THREE.Mesh; const mats = Array.isArray(m.material) ? m.material : [m.material]; meshes.push(`${m.name}[${m.type}] mats=${mats.map((x) => `${x.type}:${(x as THREE.MeshStandardMaterial).color?.getHexString()}${(x as THREE.MeshStandardMaterial).vertexColors ? ":vc" : ""}`).join(",")}`); } });
  console.log(path.split("/").slice(-2).join("/"));
  console.log("  rest:", f(rest));
  console.log("  idle:", f(idle));
  console.log("  meshes:", meshes.join(" | "));
  if (clips.length) console.log("  clips:", clips.slice(0, 12).join(" "));
}
