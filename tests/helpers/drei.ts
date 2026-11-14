/**
 * Shared `@react-three/drei` stand-in for jsdom/test-renderer suites.
 *
 * drei's `useTexture`/`useGLTF` suspend on real network loaders that never
 * resolve outside a browser, so tests swap them for synchronous fakes while
 * keeping everything else from the real module. Usage (must stay inside the
 * hoisted `vi.mock` factory):
 *
 *   vi.mock("@react-three/drei", () => import("../helpers/drei").then((m) => m.mockDrei()));
 */
import { vi } from "vitest";

export async function mockDrei() {
  const actual = await vi.importActual<typeof import("@react-three/drei")>("@react-three/drei");
  const THREE = await import("three");

  const textures = new Map<string, InstanceType<typeof THREE.Texture>>();
  const fakeTexture = (url: string) => {
    let t = textures.get(url);
    if (!t) {
      t = new THREE.Texture();
      t.name = url;
      textures.set(url, t);
    }
    return t;
  };
  const useTexture = Object.assign(
    (input: string | string[] | Record<string, string>) => {
      if (typeof input === "string") return fakeTexture(input);
      if (Array.isArray(input)) return input.map(fakeTexture);
      return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, fakeTexture(v)]));
    },
    { preload: () => undefined, clear: () => undefined },
  );

  /**
   * Synthetic glTF: a named root holding one unit cube mesh (origin at the
   * base, like every Kenney kit) plus the clip names the character rig uses.
   * Shape is irrelevant for logic tests; the structure must survive cloning,
   * instancing (traverse → Mesh parts) and `useAnimations`.
   */
  const gltfs = new Map<string, unknown>();
  const fakeGltf = (url: string) => {
    let g = gltfs.get(url);
    if (!g) {
      const scene = new THREE.Group();
      scene.name = url.split("/").pop()?.replace(/\.glb$/, "") ?? "model";
      const root = new THREE.Group();
      root.name = "root";
      const geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
      const material = new THREE.MeshStandardMaterial({ name: "colormap", color: "#ffffff" });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "body-mesh";
      root.add(mesh);
      scene.add(root);
      const times = [0, 0.5, 1];
      const animations = ["static", "idle", "walk", "sprint", "jump", "fall", "sit", "pick-up"].map(
        (name) => new THREE.AnimationClip(name, 1, [new THREE.VectorKeyframeTrack("root.position", times, [0, 0, 0, 0, 0.02, 0, 0, 0, 0])]),
      );
      g = { scene, scenes: [scene], animations, nodes: { root, "body-mesh": mesh }, materials: { colormap: material }, cameras: [], asset: {}, parser: null, userData: {} };
      gltfs.set(url, g);
    }
    return g;
  };
  const useGLTF = Object.assign(
    (input: string | string[]) => (Array.isArray(input) ? input.map(fakeGltf) : fakeGltf(input)),
    { preload: () => undefined, clear: () => undefined, setDecoderPath: () => undefined },
  );

  return { ...actual, useTexture, useGLTF };
}
