"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MODELS } from "@/config/models";
import { createRng } from "@/lib/math";
import { useQuality } from "@/game/systems/quality";
import { applyWind, gustAt, windStrength } from "@/game/systems/wind";
import { Model, ModelInstances, placementsToInstances, splitPlacements, type MaterialOverrides } from "./Model";

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

export type Placement = { x: number; z: number; s: number; r: number; tint?: number };

export interface ScatterOptions {
  count: number;
  seed: number;
  /** Return true when (x, z) is a valid spot. */
  area: (x: number, z: number) => boolean;
  bounds: [number, number, number, number]; // minX, maxX, minZ, maxZ
  scale?: [number, number];
  /** Minimum distance to these points (keeps paths & hubs clear). */
  avoid?: Array<[number, number, number]>;
  avoidRadius?: number;
  /** Minimum spacing between placements of this scatter. */
  spacing?: number;
}

/** Deterministic rejection-sampling scatter. */
export function scatter({ count, seed, area, bounds, scale = [0.8, 1.3], avoid = [], avoidRadius = 2.5, spacing = 0 }: ScatterOptions): Placement[] {
  const rng = createRng(seed);
  const out: Placement[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 30) {
    attempts += 1;
    const x = rng.range(bounds[0], bounds[1]);
    const z = rng.range(bounds[2], bounds[3]);
    if (!area(x, z)) continue;
    if (avoid.some((p) => Math.hypot(p[0] - x, p[2] - z) < avoidRadius)) continue;
    if (spacing > 0 && out.some((p) => Math.hypot(p.x - x, p.z - z) < spacing)) continue;
    out.push({ x, z, s: rng.range(scale[0], scale[1]), r: rng.range(0, Math.PI * 2), tint: rng.next() });
  }
  return out;
}

function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  placements: Placement[],
  getHeight: (x: number, z: number) => number,
  yOffset: number,
  colors?: string[],
  tilt = 0,
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const palette = colors?.map((c) => new THREE.Color(c));
    placements.forEach((p, i) => {
      tmpObj.position.set(p.x, getHeight(p.x, p.z) + yOffset * p.s, p.z);
      tmpObj.rotation.set(tilt * ((p.tint ?? 0.5) - 0.5), p.r, tilt * ((p.r % 1) - 0.5));
      tmpObj.scale.setScalar(p.s);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
      if (palette) {
        tmpColor.copy(palette[Math.floor((p.tint ?? 0) * palette.length) % palette.length]);
        mesh.setColorAt(i, tmpColor);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, placements, getHeight, yOffset, colors, tilt]);
}

/* -------------------------------------------------------------------------- */
/*  Trees                                                                     */
/* -------------------------------------------------------------------------- */

export type TreeVariant = "round" | "pine" | "willow" | "palm" | "fall";

const LEAF_MATERIALS = ["leafsGreen", "leafsDark", "leafsFall"];
const BARK_MATERIALS = ["woodBark", "woodBarkDark", "woodBirch"];

const TREE_SETS: Record<TreeVariant, { urls: string[]; scale: number }> = {
  round: { urls: [MODELS.natTreeOak, MODELS.natTreeFat, MODELS.natTreeDefault, MODELS.natTreeDetailed], scale: 3.1 },
  pine: { urls: [MODELS.natTreePineDefaultA, MODELS.natTreePineRoundA, MODELS.natTreePineTallADetailed, MODELS.natTreePineSmallA], scale: 2.9 },
  willow: { urls: [MODELS.natTreePlateau, MODELS.natTreeTall, MODELS.natTreeThin, MODELS.natTreeSimple], scale: 3 },
  palm: { urls: [MODELS.natTreePalmDetailedTall, MODELS.natTreePalmBend], scale: 3 },
  fall: { urls: [MODELS.natTreeOakFall, MODELS.natTreeDetailedFall, MODELS.natTreeFatFall], scale: 3.1 },
};

export interface TreesProps {
  placements: Placement[];
  getHeight: (x: number, z: number) => number;
  trunkColor?: string;
  leafColors?: string[];
  variant?: TreeVariant;
  castShadow?: boolean;
  /** Extra multiplier on the kit's natural size. */
  scale?: number;
  /** Canopy sway amount (0 = rigid). */
  wind?: number;
}

/** Instanced Kenney trees — several model variants, palette-tinted leaves. */
export function Trees({ placements, getHeight, trunkColor = "#6b4a3a", leafColors = ["#4f8f6a", "#3e7a5b", "#5f9f72"], variant = "round", castShadow = true, scale = 1, wind = 0.7 }: TreesProps) {
  const set = TREE_SETS[variant];
  const buckets = useMemo(() => splitPlacements(placements, set.urls.length), [placements, set.urls.length]);
  const overrides = useMemo<MaterialOverrides>(
    () => ({
      ...Object.fromEntries(BARK_MATERIALS.map((m) => [m, { color: trunkColor }])),
      ...Object.fromEntries(LEAF_MATERIALS.map((m) => [m, { wind }])),
    }),
    [trunkColor, wind],
  );
  const instanceSets = useMemo(() => buckets.map((b) => placementsToInstances(b, { getHeight, colors: leafColors })), [buckets, getHeight, leafColors]);
  return (
    <group>
      {set.urls.map((url, i) => (
        <ModelInstances key={url} url={url} instances={instanceSets[i]} scale={set.scale * scale} overrides={overrides} tintMaterials={LEAF_MATERIALS} castShadow={castShadow} />
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grass / flowers / bushes / rocks                                          */
/* -------------------------------------------------------------------------- */

/** Instanced grass tufts that sway in the wind (vertex shader via onBeforeCompile). */
export function GrassTufts({ placements, getHeight, color = "#5fa877", height = 0.55, wind = 3 }: { placements: Placement[]; getHeight: (x: number, z: number) => number; color?: string; height?: number; wind?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, placements, getHeight, 0);
  const geometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.12, height, 4, 1, true);
    g.translate(0, height / 2, 0);
    return g;
  }, [height]);
  const material = useMemo(() => applyWind(new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide }), wind), [color, wind]);
  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} receiveShadow />;
}

const FLOWER_URLS = [MODELS.natFlowerPurpleA, MODELS.natFlowerRedA, MODELS.natFlowerYellowA, MODELS.natFlowerPurpleB, MODELS.natFlowerRedB, MODELS.natFlowerYellowB, MODELS.natFlowerPurpleC, MODELS.natFlowerRedC, MODELS.natFlowerYellowC];
const PETAL_MATERIALS = ["colorPurple", "colorRed", "colorYellow"];

/** Instanced Kenney flowers with palette-tinted petals. */
export function FlowerField({ placements, getHeight, colors = ["#ff8fb8", "#ffd1e3", "#f3d08a", "#b9a7ff", "#ffffff"], stemColor = "#3f7a4e", scale = 1, wind = 5 }: { placements: Placement[]; getHeight: (x: number, z: number) => number; colors?: string[]; stemColor?: string; scale?: number; wind?: number }) {
  const buckets = useMemo(() => splitPlacements(placements, FLOWER_URLS.length), [placements]);
  const overrides = useMemo<MaterialOverrides>(() => ({ grass: { color: stemColor, wind }, ...Object.fromEntries(PETAL_MATERIALS.map((m) => [m, { wind }])) }), [stemColor, wind]);
  const instanceSets = useMemo(() => buckets.map((b) => placementsToInstances(b, { getHeight, colors })), [buckets, getHeight, colors]);
  return (
    <group>
      {FLOWER_URLS.map((url, i) => (
        <ModelInstances key={url} url={url} instances={instanceSets[i]} scale={2.2 * scale} overrides={overrides} tintMaterials={PETAL_MATERIALS} castShadow={false} />
      ))}
    </group>
  );
}

const BUSH_URLS = [MODELS.natPlantBush, MODELS.natPlantBushDetailed, MODELS.natPlantBushLarge];

/** Instanced low bushes. */
export function Bushes({ placements, getHeight, color = "#3f7a4e", scale = 1, wind = 1.5 }: { placements: Placement[]; getHeight: (x: number, z: number) => number; color?: string; scale?: number; wind?: number }) {
  const buckets = useMemo(() => splitPlacements(placements, BUSH_URLS.length), [placements]);
  const overrides = useMemo<MaterialOverrides>(() => ({ grass: { color, wind } }), [color, wind]);
  const instanceSets = useMemo(() => buckets.map((b) => placementsToInstances(b, { getHeight })), [buckets, getHeight]);
  return (
    <group>
      {BUSH_URLS.map((url, i) => (
        <ModelInstances key={url} url={url} instances={instanceSets[i]} scale={2.6 * scale} overrides={overrides} castShadow={false} />
      ))}
    </group>
  );
}

const ROCK_URLS = [MODELS.natRockLargeA, MODELS.natRockLargeC, MODELS.natRockTallB, MODELS.natRockTallD, MODELS.natStoneLargeB, MODELS.natStoneTallC, MODELS.natRockSmallFlatA];

/** Instanced Kenney rocks and stones. */
export function Rocks({ placements, getHeight, color = "#5a5270", mossColor, scale = 1 }: { placements: Placement[]; getHeight: (x: number, z: number) => number; color?: string; mossColor?: string; scale?: number }) {
  const buckets = useMemo(() => splitPlacements(placements, ROCK_URLS.length), [placements]);
  const overrides = useMemo<MaterialOverrides>(() => {
    const dark = `#${new THREE.Color(color).multiplyScalar(0.78).getHexString()}`;
    return { stone: { color }, dirt: { color }, stoneDark: { color: dark }, grass: { color: mossColor ?? dark } };
  }, [color, mossColor]);
  const instanceSets = useMemo(() => buckets.map((b) => placementsToInstances(b, { getHeight, yOffset: -0.05 })), [buckets, getHeight]);
  return (
    <group>
      {ROCK_URLS.map((url, i) => (
        <ModelInstances key={url} url={url} instances={instanceSets[i]} scale={1.3 * scale} overrides={overrides} />
      ))}
    </group>
  );
}

/** Glowing crystals — emissive clusters used on the sky island and castle. */
export function Crystals({ placements, getHeight, color = "#b9a7ff" }: { placements: Placement[]; getHeight: (x: number, z: number) => number; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useInstances(ref, placements, getHeight, 0.6, undefined, 0.5);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 1.7) * 0.4;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} castShadow>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={1.5} roughness={0.2} metalness={0.1} transparent opacity={0.92} />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lanterns                                                                  */
/* -------------------------------------------------------------------------- */

export type LanternStyle = "post" | "double" | "hanging" | "stone";

const LANTERN_MODELS: Record<LanternStyle, { url: string; scale: number; glows: Array<[number, number, number]>; glowSize: [number, number, number] }> = {
  post: { url: MODELS.graveLightpostSingle, scale: 2, glows: [[-0.14, 1.03, 0]], glowSize: [0.17, 0.2, 0.17] },
  double: { url: MODELS.graveLightpostDouble, scale: 2, glows: [[-0.15, 1.03, 0], [0.15, 1.03, 0]], glowSize: [0.17, 0.2, 0.17] },
  hanging: { url: MODELS.holidayLanternHanging, scale: 2.2, glows: [[0, -0.36, 0]], glowSize: [0.17, 0.2, 0.17] },
  stone: { url: MODELS.townLantern, scale: 1.8, glows: [[0, 1.42, 0]], glowSize: [0.15, 0.2, 0.15] },
};

/** A lamp post (Kenney model) with a warm flickering glow. Real light optional. */
export function Lantern({ position, color = "#ffd27a", light = false, style = "post", rotationY = 0, scale = 1 }: { position: [number, number, number]; color?: string; light?: boolean; style?: LanternStyle; rotationY?: number; scale?: number }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const swing = useRef<THREE.Group>(null);
  const seed = useMemo(() => position[0] * 1.7 + position[2] * 0.9, [position]);
  const { preset } = useQuality();
  const def = LANTERN_MODELS[style];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (glow.current) glow.current.emissiveIntensity = 2 + Math.sin(t * 3 + seed) * 0.4 + Math.sin(t * 7.3 + seed) * 0.15;
    if (swing.current && style === "hanging") {
      const g = (gustAt(position[0], position[2], t) - 0.5) * windStrength();
      swing.current.rotation.z = g * 0.18 + Math.sin(t * 1.7 + seed) * 0.03 * windStrength();
      swing.current.rotation.x = Math.sin(t * 1.1 + seed) * 0.04 * windStrength();
    }
  });
  const s = def.scale * scale;
  return (
    <group ref={swing} position={position} rotation={[0, rotationY, 0]}>
      <Model url={def.url} scale={s} castShadow={preset.shadows} />
      {def.glows.map((g, i) => (
        <mesh key={i} position={[g[0] * s, g[1] * s, g[2] * s]}>
          <boxGeometry args={[def.glowSize[0] * s, def.glowSize[1] * s, def.glowSize[2] * s]} />
          <meshStandardMaterial ref={i === 0 ? glow : undefined} color={color} emissive={color} emissiveIntensity={2} roughness={0.3} transparent opacity={0.85} />
        </mesh>
      ))}
      {light && <pointLight position={[def.glows[0][0] * s, def.glows[0][1] * s, def.glows[0][2] * s]} color={color} intensity={6} distance={10} decay={2} />}
    </group>
  );
}
