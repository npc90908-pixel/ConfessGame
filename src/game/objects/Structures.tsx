"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useQuality } from "@/game/systems/quality";

/* -------------------------------------------------------------------------- */
/*  Plank bridge                                                              */
/* -------------------------------------------------------------------------- */

export interface PlankBridgeProps {
  /** Bridge centre on the x axis (deck runs along z). */
  x: number;
  centerZ: number;
  halfLength: number;
  halfWidth: number;
  /** Walk-height function — the drawn deck follows it exactly. */
  getHeight: (x: number, z: number) => number;
  /** Height of the ground under the posts (defaults to `getHeight`). */
  getBedHeight?: (x: number, z: number) => number;
  plankColor?: string;
  railColor?: string;
  rails?: boolean;
}

const tmpObj = new THREE.Object3D();

/**
 * A wooden footbridge built from instanced planks, railings and posts. The
 * planks are laid along the walk-height curve so the mesh the player sees is
 * the surface the controller stands on (no step, no float).
 */
export function PlankBridge({ x, centerZ, halfLength, halfWidth, getHeight, getBedHeight = getHeight, plankColor = "#7a5236", railColor = "#5a3a26", rails = true }: PlankBridgeProps) {
  const planks = useRef<THREE.InstancedMesh>(null);
  const posts = useRef<THREE.InstancedMesh>(null);
  const { preset } = useQuality();

  const layout = useMemo(() => {
    const plankStep = 0.42;
    const plankList: Array<{ z: number; y: number; tilt: number }> = [];
    for (let z = centerZ - halfLength + plankStep / 2; z <= centerZ + halfLength; z += plankStep) {
      const y = getHeight(x, z);
      const tilt = Math.atan2(getHeight(x, z + 0.2) - getHeight(x, z - 0.2), 0.4);
      plankList.push({ z, y, tilt });
    }
    const postList: Array<{ px: number; z: number; top: number; bottom: number }> = [];
    const postStep = 1.4;
    const n = Math.max(2, Math.round((halfLength * 2) / postStep));
    for (let i = 0; i <= n; i++) {
      const z = centerZ - halfLength + ((halfLength * 2) * i) / n;
      for (const side of [-1, 1]) {
        const px = x + side * (halfWidth - 0.12);
        const top = getHeight(x, z) + 0.95;
        const bottom = Math.min(getBedHeight(px, z), getHeight(x, z)) - 0.3;
        postList.push({ px, z, top, bottom });
      }
    }
    return { plankList, postList, postStep: (halfLength * 2) / n };
  }, [x, centerZ, halfLength, halfWidth, getHeight, getBedHeight]);

  useLayoutEffect(() => {
    const mesh = planks.current;
    if (!mesh) return;
    layout.plankList.forEach((p, i) => {
      tmpObj.position.set(x, p.y - 0.06, p.z);
      tmpObj.rotation.set(p.tilt, 0, 0);
      tmpObj.scale.set(1, 1, 1);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [layout, x]);

  useLayoutEffect(() => {
    const mesh = posts.current;
    if (!mesh) return;
    layout.postList.forEach((p, i) => {
      const h = p.top - p.bottom;
      tmpObj.position.set(p.px, p.bottom + h / 2, p.z);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.scale.set(1, h, 1);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(i, tmpObj.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [layout]);

  const railSegments = useMemo(() => {
    if (!rails) return [];
    const segs: Array<{ px: number; z: number; y: number; len: number; tilt: number }> = [];
    const list = layout.postList;
    for (let i = 0; i + 2 < list.length; i += 2) {
      for (const k of [0, 1]) {
        const a = list[i + k];
        const b = list[i + 2 + k];
        const dz = b.z - a.z;
        const dy = b.top - a.top;
        segs.push({ px: a.px, z: (a.z + b.z) / 2, y: (a.top + b.top) / 2 - 0.08, len: Math.hypot(dz, dy), tilt: Math.atan2(dy, dz) });
      }
    }
    return segs;
  }, [layout, rails]);

  return (
    <group>
      <instancedMesh ref={planks} args={[undefined, undefined, layout.plankList.length]} castShadow={preset.shadows} receiveShadow>
        <boxGeometry args={[halfWidth * 2, 0.12, 0.36]} />
        <meshStandardMaterial color={plankColor} roughness={0.9} />
      </instancedMesh>
      {rails && (
        <>
          <instancedMesh ref={posts} args={[undefined, undefined, layout.postList.length]} castShadow={preset.shadows}>
            <boxGeometry args={[0.14, 1, 0.14]} />
            <meshStandardMaterial color={railColor} roughness={0.9} />
          </instancedMesh>
          {railSegments.map((s, i) => (
            <mesh key={i} position={[s.px, s.y, s.z]} rotation={[-s.tilt, 0, 0]} castShadow={preset.shadows}>
              <boxGeometry args={[0.1, 0.1, s.len]} />
              <meshStandardMaterial color={railColor} roughness={0.85} />
            </mesh>
          ))}
        </>
      )}
      {/* two bearers under the deck */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[x + side * (halfWidth - 0.35), getHeight(x, centerZ) - 0.24, centerZ]} receiveShadow>
          <boxGeometry args={[0.22, 0.22, halfLength * 2 - 0.4]} />
          <meshStandardMaterial color={railColor} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hedge walls                                                               */
/* -------------------------------------------------------------------------- */

/** Boxy clipped hedges: `[x, z, halfW, halfD]`, with a slightly darker base band. */
export function HedgeWalls({ walls, getHeight, color = "#2a5a3e", height = 2.2 }: { walls: Array<[number, number, number, number]>; getHeight: (x: number, z: number) => number; color?: string; height?: number }) {
  const dark = useMemo(() => `#${new THREE.Color(color).multiplyScalar(0.7).getHexString()}`, [color]);
  return (
    <group>
      {walls.map(([x, z, hw, hd], i) => {
        const y = getHeight(x, z);
        return (
          <group key={i} position={[x, y, z]}>
            <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[hw * 2, height, hd * 2]} />
              <meshStandardMaterial color={color} roughness={1} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[hw * 2 + 0.1, 0.4, hd * 2 + 0.1]} />
              <meshStandardMaterial color={dark} roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Garden bench                                                              */
/* -------------------------------------------------------------------------- */

export function Bench({ position, rotationY = 0, color = "#6b4a3a", legColor = "#3b3b4a" }: { position: [number, number, number]; rotationY?: number; color?: string; legColor?: string }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[1.8, 0.08, 0.5]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.82, -0.22]} rotation={[-0.18, 0, 0]} castShadow>
        <boxGeometry args={[1.8, 0.45, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 0.22, 0]}>
          <boxGeometry args={[0.08, 0.45, 0.46]} />
          <meshStandardMaterial color={legColor} roughness={0.8} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lantern hook                                                              */
/* -------------------------------------------------------------------------- */

/** A wooden post with a curved arm for a hanging lantern (the lantern itself is added by the caller at `tip`). */
export function LanternHook({ position, rotationY = 0, height = 2.6, arm = 0.9, color = "#4a3a30" }: { position: [number, number, number]; rotationY?: number; height?: number; arm?: number; color?: string }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, height, 8]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[arm / 2, height - 0.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, arm, 8]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      <mesh position={[arm * 0.55, height - 0.3, 0]} rotation={[0, 0, 0.6]}>
        <cylinderGeometry args={[0.035, 0.035, 0.6, 6]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </group>
  );
}

/** Where a lantern should hang from a `LanternHook` with the same props. */
export function lanternHookTip(position: [number, number, number], rotationY = 0, height = 2.6, arm = 0.9): [number, number, number] {
  return [position[0] + Math.cos(rotationY) * arm, position[1] + height - 0.12, position[2] - Math.sin(rotationY) * arm];
}
