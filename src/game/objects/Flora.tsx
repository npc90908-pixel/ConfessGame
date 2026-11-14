"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createRng } from "@/lib/math";
import { useQuality } from "@/game/systems/quality";

const tmpObj = new THREE.Object3D();
const tmpColor = new THREE.Color();

type Placement = { x: number; z: number; s: number; r: number; tint?: number };

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
}

/** Deterministic rejection-sampling scatter. */
export function scatter({ count, seed, area, bounds, scale = [0.8, 1.3], avoid = [], avoidRadius = 2.5 }: ScatterOptions): Placement[] {
  const rng = createRng(seed);
  const out: Placement[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 30) {
    attempts += 1;
    const x = rng.range(bounds[0], bounds[1]);
    const z = rng.range(bounds[2], bounds[3]);
    if (!area(x, z)) continue;
    if (avoid.some((p) => Math.hypot(p[0] - x, p[2] - z) < avoidRadius)) continue;
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

export interface TreesProps {
  placements: Placement[];
  getHeight: (x: number, z: number) => number;
  trunkColor?: string;
  leafColors?: string[];
  /** "round" blossom trees or "pine" cones. */
  variant?: "round" | "pine" | "willow";
  castShadow?: boolean;
}

/** Instanced stylised trees (trunk + 2 canopy layers). */
export function Trees({ placements, getHeight, trunkColor = "#4a3552", leafColors = ["#4f8f6a", "#3e7a5b", "#5f9f72"], variant = "round", castShadow = true }: TreesProps) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const canopyA = useRef<THREE.InstancedMesh>(null);
  const canopyB = useRef<THREE.InstancedMesh>(null);
  const { preset } = useQuality();
  const shadows = castShadow && preset.shadows;

  useInstances(trunk, placements, getHeight, 1.1);
  useInstances(canopyA, placements, getHeight, variant === "pine" ? 2.6 : 2.9, leafColors, variant === "round" ? 0.25 : 0);
  useInstances(canopyB, placements, getHeight, variant === "pine" ? 3.7 : 3.7, leafColors, variant === "round" ? 0.25 : 0);

  const canopyGeo = useMemo(() => {
    if (variant === "pine") return new THREE.ConeGeometry(1.4, 2.4, 7);
    if (variant === "willow") return new THREE.SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.75);
    return new THREE.IcosahedronGeometry(1.5, 1);
  }, [variant]);
  const canopyGeoB = useMemo(() => {
    if (variant === "pine") return new THREE.ConeGeometry(1.05, 2, 7);
    if (variant === "willow") return new THREE.SphereGeometry(1.1, 8, 6);
    return new THREE.IcosahedronGeometry(1.05, 1);
  }, [variant]);

  return (
    <group>
      <instancedMesh ref={trunk} args={[undefined, undefined, placements.length]} castShadow={shadows} receiveShadow>
        <cylinderGeometry args={[0.16, 0.3, 2.3, 7]} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </instancedMesh>
      <instancedMesh ref={canopyA} args={[canopyGeo, undefined, placements.length]} castShadow={shadows}>
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopyB} args={[canopyGeoB, undefined, placements.length]} castShadow={shadows}>
        <meshStandardMaterial roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Grass / flowers / rocks                                                   */
/* -------------------------------------------------------------------------- */

/** Instanced grass tufts that sway in the wind (vertex shader via onBeforeCompile). */
export function GrassTufts({ placements, getHeight, color = "#5fa877", height = 0.55 }: { placements: Placement[]; getHeight: (x: number, z: number) => number; color?: string; height?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useInstances(ref, placements, getHeight, 0);
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });
  const geometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.12, height, 4, 1, true);
    g.translate(0, height / 2, 0);
    return g;
  }, [height]);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, side: THREE.DoubleSide });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float swayK = position.y * position.y;
          vec4 wp = instanceMatrix * vec4(position, 1.0);
          transformed.x += sin(uTime * 1.6 + wp.x * 0.5 + wp.z * 0.3) * 0.18 * swayK;
          transformed.z += cos(uTime * 1.3 + wp.z * 0.4) * 0.12 * swayK;`,
        );
    };
    return m;
  }, [color, uniforms]);
  return <instancedMesh ref={ref} args={[geometry, material, placements.length]} receiveShadow />;
}

/** Small instanced flowers (stem + coloured head). */
export function FlowerField({ placements, getHeight, colors = ["#ff8fb8", "#ffd1e3", "#f3d08a", "#b9a7ff", "#ffffff"] }: { placements: Placement[]; getHeight: (x: number, z: number) => number; colors?: string[] }) {
  const stems = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  useInstances(stems, placements, getHeight, 0.2);
  useInstances(heads, placements, getHeight, 0.42, colors);
  return (
    <group>
      <instancedMesh ref={stems} args={[undefined, undefined, placements.length]}>
        <cylinderGeometry args={[0.02, 0.03, 0.4, 4]} />
        <meshStandardMaterial color="#3f7a4e" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, placements.length]}>
        <dodecahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial roughness={0.6} emissiveIntensity={0.25} emissive="#ffffff" />
      </instancedMesh>
    </group>
  );
}

/** Instanced low-poly rocks. */
export function Rocks({ placements, getHeight, color = "#5a5270" }: { placements: Placement[]; getHeight: (x: number, z: number) => number; color?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useInstances(ref, placements, getHeight, 0.1, undefined, 0.6);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placements.length]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={color} roughness={1} flatShading />
    </instancedMesh>
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

/** A stone lantern post with a warm emissive cage. Real light optional. */
export function Lantern({ position, color = "#ffd27a", light = false, height = 2.2 }: { position: [number, number, number]; color?: string; light?: boolean; height?: number }) {
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const seed = useMemo(() => position[0] * 1.7 + position[2] * 0.9, [position]);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.emissiveIntensity = 1.8 + Math.sin(clock.elapsedTime * 3 + seed) * 0.35;
  });
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, height, 6]} />
        <meshStandardMaterial color="#3a3048" roughness={0.9} />
      </mesh>
      <mesh position={[0, height + 0.18, 0]} castShadow>
        <boxGeometry args={[0.34, 0.4, 0.34]} />
        <meshStandardMaterial ref={glow} color={color} emissive={color} emissiveIntensity={1.8} roughness={0.4} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, height + 0.45, 0]}>
        <coneGeometry args={[0.32, 0.22, 4]} />
        <meshStandardMaterial color="#2a2238" roughness={0.9} />
      </mesh>
      {light && <pointLight position={[0, height + 0.2, 0]} color={color} intensity={6} distance={9} decay={2} />}
    </group>
  );
}
