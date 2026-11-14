"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { skyFragment, skyVertex } from "@/lib/shaders/sky";

export interface SkyPalette {
  top: string;
  horizon: string;
  bottom: string;
  nebulaA?: string;
  nebulaB?: string;
  nebula?: number;
  stars?: number;
  sun?: number;
  sunColor?: string;
  sunDir?: [number, number, number];
  sunSize?: number;
  moon?: number;
  moonDir?: [number, number, number];
}

export const NIGHT_SKY: SkyPalette = {
  top: "#07041a",
  horizon: "#2a1b5e",
  bottom: "#06040f",
  nebulaA: "#5b3aa8",
  nebulaB: "#c2498a",
  nebula: 1,
  stars: 1,
  sun: 0,
  sunColor: "#ffb08a",
  sunDir: [0, 0.1, -1],
  sunSize: 0.03,
  moon: 1,
  moonDir: [-0.35, 0.45, -0.82],
};

export interface SkyDomeProps {
  palette?: SkyPalette;
  /** Optional per-frame driver to animate the uniforms (sunrise, title reveal). */
  onFrame?: (uniforms: Record<string, THREE.IUniform>, t: number) => void;
  radius?: number;
}

/** Procedural sky sphere: gradient, nebulae, twinkling stars, sun & moon. */
export function SkyDome({ palette = NIGHT_SKY, onFrame, radius = 480 }: SkyDomeProps) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color(palette.top) },
      uHorizon: { value: new THREE.Color(palette.horizon) },
      uBottom: { value: new THREE.Color(palette.bottom) },
      uNebulaA: { value: new THREE.Color(palette.nebulaA ?? "#5b3aa8") },
      uNebulaB: { value: new THREE.Color(palette.nebulaB ?? "#c2498a") },
      uNebula: { value: palette.nebula ?? 1 },
      uStars: { value: palette.stars ?? 1 },
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(...(palette.sunDir ?? [0, 0.1, -1])) },
      uSunColor: { value: new THREE.Color(palette.sunColor ?? "#ffb08a") },
      uSun: { value: palette.sun ?? 0 },
      uSunSize: { value: palette.sunSize ?? 0.03 },
      uMoonDir: { value: new THREE.Vector3(...(palette.moonDir ?? [-0.35, 0.45, -0.82])) },
      uMoon: { value: palette.moon ?? 1 },
    }),
    // Palette is treated as initial state; animate via onFrame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    onFrame?.(uniforms, clock.elapsedTime);
  });

  return (
    <mesh frustumCulled={false} renderOrder={-100}>
      <sphereGeometry args={[radius, 48, 32]} />
      <shaderMaterial
        ref={material}
        vertexShader={skyVertex}
        fragmentShader={skyFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
        toneMapped
      />
    </mesh>
  );
}
