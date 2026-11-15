"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { useQuality } from "@/game/systems/quality";
import { applyWind } from "@/game/systems/wind";
import type { Placement } from "./Flora";

/* -------------------------------------------------------------------------- */
/*  Loading                                                                   */
/* -------------------------------------------------------------------------- */

/** Per-material tweaks keyed by the material name inside the GLB. */
export type MaterialOverride = {
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  opacity?: number;
  flatShading?: boolean;
  /** Sway amount for the shared wind field (see `systems/wind.ts`); 0/undefined = rigid. */
  wind?: number;
};
export type MaterialOverrides = Record<string, MaterialOverride>;

type Gltf = ReturnType<typeof useGLTF> extends infer R ? (R extends unknown[] ? never : R) : never;

export function useModel(url: string): Gltf {
  return useGLTF(url) as Gltf;
}

export function preloadModels(urls: readonly string[]) {
  for (const url of urls) useGLTF.preload(url);
}

/** Treat structurally-equal override objects as the same value (callers pass literals). */
function useStableOverrides(overrides?: MaterialOverrides): MaterialOverrides | undefined {
  const key = overrides ? JSON.stringify(overrides) : "";
  const ref = useRef<{ key: string; value?: MaterialOverrides }>({ key, value: overrides });
  if (ref.current.key !== key) ref.current = { key, value: overrides };
  return ref.current.value;
}

const overrideCache = new WeakMap<THREE.Material, Map<string, THREE.Material>>();

function overrideKey(o: MaterialOverride) {
  return JSON.stringify(o);
}

/**
 * Return a material with the override applied. Results are cached per source
 * material + override so hundreds of instances share one GPU program.
 */
export function overrideMaterial(source: THREE.Material, o?: MaterialOverride): THREE.Material {
  if (!o) return source;
  let bucket = overrideCache.get(source);
  if (!bucket) {
    bucket = new Map();
    overrideCache.set(source, bucket);
  }
  const key = overrideKey(o);
  let mat = bucket.get(key);
  if (mat) return mat;
  mat = source.clone();
  if (mat instanceof THREE.MeshStandardMaterial) {
    if (o.color) mat.color.set(o.color);
    if (o.emissive) mat.emissive.set(o.emissive);
    if (o.emissiveIntensity !== undefined) mat.emissiveIntensity = o.emissiveIntensity;
    if (o.roughness !== undefined) mat.roughness = o.roughness;
    if (o.metalness !== undefined) mat.metalness = o.metalness;
    if (o.flatShading !== undefined) mat.flatShading = o.flatShading;
  }
  if (o.opacity !== undefined) {
    mat.transparent = o.opacity < 1;
    mat.opacity = o.opacity;
  }
  if (o.wind) applyWind(mat, o.wind);
  mat.needsUpdate = true;
  bucket.set(key, mat);
  return mat;
}

/** Kenney palettes are flat; a touch of roughness variation reads better under our lights. */
function polishMaterial(mat: THREE.Material) {
  if (mat instanceof THREE.MeshStandardMaterial) {
    if (mat.map) {
      mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.map.magFilter = THREE.NearestFilter;
      mat.map.minFilter = THREE.LinearMipmapLinearFilter;
      mat.map.generateMipmaps = true;
      mat.map.anisotropy = 4;
    }
    mat.roughness = Math.min(mat.roughness, 0.92);
  }
}

/* -------------------------------------------------------------------------- */
/*  Single placed model                                                       */
/* -------------------------------------------------------------------------- */

export interface ModelProps extends Omit<React.ComponentProps<"group">, "scale"> {
  url: string;
  scale?: number | [number, number, number];
  overrides?: MaterialOverrides;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Called with the cloned scene once it exists (attach props, find bones…). */
  onScene?: (scene: THREE.Object3D) => void;
}

/**
 * A Kenney glTF placed in the world. The cached scene is cloned per use
 * (skeleton-aware) so the same URL can appear many times, and material
 * overrides let one kit fit several colour palettes.
 */
export function Model({ url, scale = 1, overrides: overridesProp, castShadow = true, receiveShadow = true, onScene, children, ...rest }: ModelProps) {
  const gltf = useModel(url);
  const overrides = useStableOverrides(overridesProp);
  const { preset } = useQuality();
  const shadows = castShadow && preset.shadows;
  const scene = useMemo(() => {
    const root = cloneSkeleton(gltf.scene) as THREE.Group;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(polishMaterial);
        if (overrides) {
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map((m) => overrideMaterial(m, overrides[m.name]))
            : overrideMaterial(mesh.material, overrides[mesh.material.name]);
        }
      }
    });
    return root;
  }, [gltf.scene, overrides]);

  useLayoutEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = shadows;
        obj.receiveShadow = receiveShadow;
      }
    });
  }, [scene, shadows, receiveShadow]);

  useLayoutEffect(() => {
    onScene?.(scene);
  }, [scene, onScene]);

  const s: [number, number, number] = typeof scale === "number" ? [scale, scale, scale] : scale;
  return (
    <group {...rest} scale={s} dispose={null}>
      <primitive object={scene} />
      {children}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Instancing                                                                */
/* -------------------------------------------------------------------------- */

export interface Instance {
  position: [number, number, number];
  /** Yaw in radians (ignored when `rotation` is given). */
  rotationY?: number;
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  /** Per-instance tint for the materials listed in `tintMaterials`. */
  color?: string | number;
}

export interface ModelPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  name: string;
  /** Transform of the mesh inside the glTF scene. */
  matrix: THREE.Matrix4;
}

/** Flatten a glTF scene into (geometry, material, matrix) parts for instancing. */
export function useModelParts(url: string): ModelPart[] {
  const gltf = useModel(url);
  return useMemo(() => {
    const parts: ModelPart[] = [];
    gltf.scene.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(gltf.scene.matrixWorld).invert();
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
      const matrix = new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(polishMaterial);
      if (Array.isArray(mesh.material) && mesh.geometry.groups.length > 1) {
        // Split multi-material meshes into one part per group.
        mesh.geometry.groups.forEach((g, i) => {
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", mesh.geometry.getAttribute("position"));
          if (mesh.geometry.getAttribute("normal")) geo.setAttribute("normal", mesh.geometry.getAttribute("normal"));
          if (mesh.geometry.getAttribute("uv")) geo.setAttribute("uv", mesh.geometry.getAttribute("uv"));
          if (mesh.geometry.getAttribute("color")) geo.setAttribute("color", mesh.geometry.getAttribute("color"));
          const index = mesh.geometry.getIndex();
          if (index) geo.setIndex(new THREE.BufferAttribute(index.array.slice(g.start, g.start + g.count), 1));
          geo.computeBoundingSphere();
          const material = materials[g.materialIndex ?? i] ?? materials[0];
          parts.push({ geometry: geo, material, name: material.name, matrix });
        });
      } else {
        parts.push({ geometry: mesh.geometry, material: materials[0], name: materials[0].name, matrix });
      }
    });
    return parts;
  }, [gltf.scene]);
}

export interface ModelInstancesProps {
  url: string;
  instances: Instance[];
  /** Extra uniform scale applied to every instance (kit pieces are ~1 m). */
  scale?: number;
  overrides?: MaterialOverrides;
  /** Material names that receive the per-instance `color` (default: all when any instance has a colour). */
  tintMaterials?: string[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
}

const tmpMat = new THREE.Matrix4();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpScale = new THREE.Vector3();
const tmpColor = new THREE.Color();

function InstancedPart({ part, instances, scale, overrides, tinted, castShadow, receiveShadow, frustumCulled }: { part: ModelPart; instances: Instance[]; scale: number; overrides?: MaterialOverrides; tinted: boolean; castShadow: boolean; receiveShadow: boolean; frustumCulled: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const material = useMemo(() => {
    const o = overrides?.[part.name];
    const base = overrideMaterial(part.material, o);
    if (!tinted) return base;
    // Instance colours multiply the material colour, so neutralise flat palettes
    // (clones drop onBeforeCompile, so re-request the wind patch).
    return overrideMaterial(base, { color: "#ffffff", wind: o?.wind });
  }, [part.material, part.name, overrides, tinted]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    instances.forEach((inst, i) => {
      tmpPos.set(inst.position[0], inst.position[1], inst.position[2]);
      if (inst.rotation) tmpEuler.set(inst.rotation[0], inst.rotation[1], inst.rotation[2]);
      else tmpEuler.set(0, inst.rotationY ?? 0, 0);
      tmpQuat.setFromEuler(tmpEuler);
      const s = inst.scale ?? 1;
      if (typeof s === "number") tmpScale.setScalar(s * scale);
      else tmpScale.set(s[0] * scale, s[1] * scale, s[2] * scale);
      tmpMat.compose(tmpPos, tmpQuat, tmpScale).multiply(part.matrix);
      mesh.setMatrixAt(i, tmpMat);
      if (tinted) {
        tmpColor.set(inst.color ?? "#ffffff");
        mesh.setColorAt(i, tmpColor);
      }
    });
    mesh.count = instances.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances, scale, part.matrix, tinted]);

  if (instances.length === 0) return null;
  return <instancedMesh ref={ref} args={[part.geometry, material, instances.length]} castShadow={castShadow} receiveShadow={receiveShadow} frustumCulled={frustumCulled} />;
}

/**
 * Many copies of one Kenney model as instanced meshes — one draw call per
 * material in the GLB regardless of how many instances are placed.
 */
export function ModelInstances({ url, instances, scale = 1, overrides: overridesProp, tintMaterials, castShadow = true, receiveShadow = true, frustumCulled = true }: ModelInstancesProps) {
  const parts = useModelParts(url);
  const overrides = useStableOverrides(overridesProp);
  const { preset } = useQuality();
  const shadows = castShadow && preset.shadows;
  const anyColor = useMemo(() => instances.some((i) => i.color !== undefined), [instances]);
  return (
    <group dispose={null}>
      {parts.map((part, i) => (
        <InstancedPart key={i} part={part} instances={instances} scale={scale} overrides={overrides} tinted={anyColor && (!tintMaterials || tintMaterials.includes(part.name))} castShadow={shadows} receiveShadow={receiveShadow} frustumCulled={frustumCulled} />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scatter → instances                                                       */
/* -------------------------------------------------------------------------- */

export interface PlacementToInstanceOptions {
  getHeight: (x: number, z: number) => number;
  /** Lift/sink along y (in metres, before scale). */
  yOffset?: number;
  /** Palette picked per placement via its `tint` value. */
  colors?: string[];
  /** Random tilt amplitude (radians) for rocks and the like. */
  tilt?: number;
}

/** Convert deterministic scatter placements into instance transforms. */
export function placementsToInstances(placements: Placement[], { getHeight, yOffset = 0, colors, tilt = 0 }: PlacementToInstanceOptions): Instance[] {
  return placements.map((p) => {
    const t = p.tint ?? 0.5;
    const color = colors ? colors[Math.floor(t * colors.length) % colors.length] : undefined;
    return {
      position: [p.x, getHeight(p.x, p.z) + yOffset, p.z],
      rotation: tilt ? [tilt * (t - 0.5), p.r, tilt * ((p.r % 1) - 0.5)] : undefined,
      rotationY: p.r,
      scale: p.s,
      color,
    };
  });
}

/**
 * Split placements across several model variants (deterministically by the
 * placement tint) so a forest is not 60 copies of one tree.
 */
export function splitPlacements(placements: Placement[], variants: number): Placement[][] {
  const buckets: Placement[][] = Array.from({ length: variants }, () => []);
  placements.forEach((p, i) => {
    const t = p.tint ?? 0;
    const k = Math.floor(((t * 7919 + i * 0.37) % 1) * variants) % variants;
    buckets[k].push(p);
  });
  return buckets;
}
