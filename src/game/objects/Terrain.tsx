"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { createRng, makeNoise2D, smoothstep } from "@/lib/math";

/* -------------------------------------------------------------------------- */
/*  Geometry helpers                                                          */
/* -------------------------------------------------------------------------- */

export interface HeightField {
  getHeight: (x: number, z: number) => number;
}

/**
 * Gentle rolling height field used by most walkable environments. Amplitude
 * is small so the controller never fights slopes; `flatRadius` keeps hubs flat.
 */
export function makeRollingHeight(seed: number, amplitude = 0.35, frequency = 0.08, flatSpots: Array<[number, number, number]> = []) {
  const { noise } = makeNoise2D(seed);
  return (x: number, z: number) => {
    let h = noise(x * frequency, z * frequency) * amplitude + noise(x * frequency * 2.7 + 10, z * frequency * 2.7) * amplitude * 0.35;
    for (const [fx, fz, fr] of flatSpots) {
      const d = Math.hypot(x - fx, z - fz);
      const k = smoothstep(fr * 0.6, fr * 1.4, d);
      h *= k;
    }
    return h;
  };
}

/** Build a displaced disc (top surface) following a height function. */
export function buildDiscSurface(radius: number, segments: number, rings: number, getHeight: (x: number, z: number) => number) {
  const geometry = new THREE.CircleGeometry(radius, segments);
  // CircleGeometry is a fan — subdivide by using PlaneGeometry clipped to a disc instead.
  geometry.dispose();
  const plane = new THREE.PlaneGeometry(radius * 2, radius * 2, rings, rings);
  plane.rotateX(-Math.PI / 2);
  const pos = plane.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.hypot(x, z);
    if (d > radius) {
      const k = radius / d;
      pos.setX(i, x * k);
      pos.setZ(i, z * k);
    }
    pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  plane.computeVertexNormals();
  return plane;
}

/**
 * Underside of a floating island: a lathe of jagged rock tapering to a tip.
 */
export function buildIslandUnderside(radius: number, depth: number, seed: number) {
  const rng = createRng(seed);
  const points: THREE.Vector2[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = radius * (1 - Math.pow(t, 1.6)) * (0.95 + rng.range(-0.05, 0.05)) + (i === steps ? 0 : 0.2);
    points.push(new THREE.Vector2(Math.max(0.01, r), -t * depth));
  }
  const geo = new THREE.LatheGeometry(points, 28);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const { noise } = makeNoise2D(seed + 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = noise(x * 0.35, z * 0.35 + y * 0.2);
    const k = 1 + n * 0.12;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  Components                                                                */
/* -------------------------------------------------------------------------- */

export interface FloatingIslandProps {
  radius: number;
  getHeight: (x: number, z: number) => number;
  topColor?: string;
  cliffColor?: string;
  depth?: number;
  seed?: number;
  position?: [number, number, number];
  rings?: number;
  receiveShadow?: boolean;
}

/** A grassy floating island: displaced top disc + rocky underside. */
export function FloatingIsland({
  radius,
  getHeight,
  topColor = "#3f7d5a",
  cliffColor = "#3d3356",
  depth = 14,
  seed = 1,
  position = [0, 0, 0],
  rings = 48,
  receiveShadow = true,
}: FloatingIslandProps) {
  const top = useMemo(() => buildDiscSurface(radius, 64, rings, getHeight), [radius, rings, getHeight]);
  const under = useMemo(() => buildIslandUnderside(radius, depth, seed), [radius, depth, seed]);
  const rim = useMemo(() => new THREE.TorusGeometry(radius - 0.15, 0.55, 8, 72), [radius]);
  return (
    <group position={position}>
      <mesh geometry={top} receiveShadow={receiveShadow}>
        <meshStandardMaterial color={topColor} roughness={0.95} metalness={0} />
      </mesh>
      <mesh geometry={under} position={[0, -0.1, 0]}>
        <meshStandardMaterial color={cliffColor} roughness={1} flatShading />
      </mesh>
      <mesh geometry={rim} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <meshStandardMaterial color={cliffColor} roughness={1} />
      </mesh>
    </group>
  );
}

export interface GroundProps {
  size: number;
  getHeight: (x: number, z: number) => number;
  color?: string;
  segments?: number;
  position?: [number, number, number];
}

/** Large square ground with a rolling height field. */
export function Ground({ size, getHeight, color = "#2f5e48", segments = 96, position = [0, 0, 0] }: GroundProps) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(size, size, segments, segments);
    plane.rotateX(-Math.PI / 2);
    const pos = plane.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, getHeight(pos.getX(i), pos.getZ(i)));
    pos.needsUpdate = true;
    plane.computeVertexNormals();
    return plane;
  }, [size, segments, getHeight]);
  return (
    <mesh geometry={geometry} position={position} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/** Circular stone path / plaza disc that sits just above the ground. */
export function StoneDisc({
  position,
  radius,
  color = "#7a7290",
  height = 0.08,
  segments = 40,
}: {
  position: [number, number, number];
  radius: number;
  color?: string;
  height?: number;
  segments?: number;
}) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} receiveShadow castShadow>
      <cylinderGeometry args={[radius, radius * 1.03, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

/**
 * A soft glowing path made of stepping discs between waypoints. Returns the
 * discs as instanced meshes with an emissive material.
 */
export function GlowingPath({
  points,
  getHeight,
  spacing = 1.6,
  color = "#ffd6e7",
  intensity = 1.2,
  radius = 0.45,
}: {
  points: Array<[number, number, number]>;
  getHeight: (x: number, z: number) => number;
  spacing?: number;
  color?: string;
  intensity?: number;
  radius?: number;
}) {
  const matrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const rng = createRng(99);
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
      const n = Math.max(1, Math.floor(len / spacing));
      for (let j = 0; j <= n; j++) {
        const t = j / n;
        const x = a[0] + (b[0] - a[0]) * t + rng.range(-0.25, 0.25);
        const z = a[2] + (b[2] - a[2]) * t + rng.range(-0.25, 0.25);
        const s = rng.range(0.8, 1.15);
        m.compose(new THREE.Vector3(x, getHeight(x, z) + 0.04, z), new THREE.Quaternion(), new THREE.Vector3(s, 1, s));
        list.push(m.clone());
      }
    }
    return list;
  }, [points, getHeight, spacing]);

  return (
    <instancedMesh
      args={[undefined, undefined, matrices.length]}
      ref={(mesh) => {
        if (!mesh) return;
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.instanceMatrix.needsUpdate = true;
      }}
      receiveShadow
    >
      <cylinderGeometry args={[radius, radius, 0.06, 14]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} roughness={0.6} />
    </instancedMesh>
  );
}
