"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { PARTICLES, type ParticleTextureId } from "@/config/assets";
import { useQuality } from "@/game/systems/quality";
import { createRng } from "@/lib/math";
import { particleFragment, particleVertex } from "@/lib/shaders/particles";

export interface ParticlesProps {
  count: number;
  texture?: ParticleTextureId;
  /** One colour or a list to pick from per particle. */
  color?: string | string[];
  /** [min, max] point size in world-ish units. */
  size?: [number, number];
  /** Box in which particles live & wrap. */
  area?: [number, number, number];
  center?: [number, number, number];
  /** Base drift velocity (units/s). */
  velocity?: [number, number, number];
  /** Random velocity magnitude added per particle. */
  jitter?: number;
  sway?: number;
  gravity?: number;
  opacity?: number;
  twinkle?: number;
  spin?: number;
  additive?: boolean;
  seed?: number;
  /** Multiply the global time (0 freezes). */
  timeScale?: number;
  /** Optional dynamic opacity driver. */
  getOpacity?: () => number;
  depthWrite?: boolean;
  renderOrder?: number;
}

/**
 * GPU sprite particle system. Positions never leave the GPU: drift, wrap,
 * twinkle and spin are all computed in the vertex/fragment shaders.
 */
export function Particles({
  count,
  texture = "glow",
  color = "#ffffff",
  size = [0.2, 0.6],
  area = [20, 10, 20],
  center = [0, 5, 0],
  velocity = [0, 0.15, 0],
  jitter = 0.1,
  sway = 0.3,
  gravity = 0,
  opacity = 1,
  twinkle = 1,
  spin = 0,
  additive = true,
  seed = 1,
  timeScale = 1,
  getOpacity,
  depthWrite = false,
  renderOrder = 10,
}: ParticlesProps) {
  const map = useTexture(PARTICLES[texture]);
  const { preset } = useQuality();
  const dpr = useThree((s) => s.viewport.dpr);
  const points = useRef<THREE.Points>(null);
  const effectiveCount = Math.max(4, Math.round(count * preset.particleScale));

  const { geometry, uniforms } = useMemo(() => {
    const rng = createRng(seed * 7919);
    const positions = new Float32Array(effectiveCount * 3);
    const sizes = new Float32Array(effectiveCount);
    const seeds = new Float32Array(effectiveCount);
    const velocities = new Float32Array(effectiveCount * 3);
    const colors = new Float32Array(effectiveCount * 3);
    const palette = (Array.isArray(color) ? color : [color]).map((c) => new THREE.Color(c));
    for (let i = 0; i < effectiveCount; i++) {
      positions[i * 3] = center[0] + (rng.next() - 0.5) * area[0];
      positions[i * 3 + 1] = center[1] + (rng.next() - 0.5) * area[1];
      positions[i * 3 + 2] = center[2] + (rng.next() - 0.5) * area[2];
      sizes[i] = size[0] + rng.next() * (size[1] - size[0]);
      seeds[i] = rng.next();
      velocities[i * 3] = velocity[0] + (rng.next() - 0.5) * jitter;
      velocities[i * 3 + 1] = velocity[1] + (rng.next() - 0.5) * jitter;
      velocities[i * 3 + 2] = velocity[2] + (rng.next() - 0.5) * jitter;
      const c = palette[Math.floor(rng.next() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aVelocity", new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(...center), Math.hypot(...area));
    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uScale: { value: 1 },
      uBounds: { value: new THREE.Vector3(...area) },
      uCenter: { value: new THREE.Vector3(...center) },
      uTwinkle: { value: twinkle },
      uSway: { value: sway },
      uGravity: { value: gravity },
      uMap: { value: map },
      uOpacity: { value: opacity },
      uSpin: { value: spin },
    };
    return { geometry, uniforms };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveCount, seed, map]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime * timeScale;
    uniforms.uPixelRatio.value = dpr;
    uniforms.uOpacity.value = getOpacity ? getOpacity() * opacity : opacity;
    uniforms.uCenter.value.set(center[0], center[1], center[2]);
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false} renderOrder={renderOrder}>
      <shaderMaterial
        vertexShader={particleVertex}
        fragmentShader={particleFragment}
        uniforms={uniforms}
        transparent
        depthWrite={depthWrite}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}
