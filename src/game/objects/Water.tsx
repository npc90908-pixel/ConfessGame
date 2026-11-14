"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { TEXTURES } from "@/config/assets";
import { useQuality } from "@/game/systems/quality";
import { waterFragment, waterVertex } from "@/lib/shaders/water";

export interface WaterProps {
  size?: number;
  segments?: number;
  position?: [number, number, number];
  shallow?: string;
  deep?: string;
  sunriseShallow?: string;
  sunriseDeep?: string;
  foam?: string;
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;
  moonDir?: [number, number, number];
  sunDir?: [number, number, number];
  waveHeight?: number;
  /** 0 = night, 1 = sunrise. Read every frame. */
  getSunrise?: () => number;
  /** Receive the current fog colour each frame (so the sunrise can tint it). */
  getFogColor?: (out: THREE.Color) => void;
}

/**
 * Large stylised ocean plane driven by the custom water shader. Wave
 * displacement happens in the vertex shader; the mesh itself is static.
 */
export function Water({
  size = 600,
  segments = 160,
  position = [0, 0, 0],
  shallow = "#1d4f7a",
  deep = "#071633",
  sunriseShallow = "#ff9f8a",
  sunriseDeep = "#5a3a7a",
  foam = "#dff3ff",
  fogColor = "#0a0a24",
  fogNear = 60,
  fogFar = 260,
  moonDir = [-0.35, 0.45, -0.82],
  sunDir = [0.2, 0.08, -1],
  waveHeight = 1,
  getSunrise,
  getFogColor,
}: WaterProps) {
  const normalMap = useTexture(TEXTURES.waterNormal);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  const camera = useThree((s) => s.camera);
  const { tier } = useQuality();
  const segs = tier === "low" ? Math.round(segments * 0.5) : segments;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaveHeight: { value: waveHeight },
      uNormalMap: { value: normalMap },
      uShallow: { value: new THREE.Color(shallow) },
      uDeep: { value: new THREE.Color(deep) },
      uSunriseShallow: { value: new THREE.Color(sunriseShallow) },
      uSunriseDeep: { value: new THREE.Color(sunriseDeep) },
      uSunrise: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(...moonDir).normalize() },
      uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
      uFoamColor: { value: new THREE.Color(foam) },
      uCameraPos: { value: new THREE.Vector3() },
      uFogColor: { value: new THREE.Color(fogColor) },
      uFogNear: { value: fogNear },
      uFogFar: { value: fogFar },
    }),
    [normalMap, shallow, deep, sunriseShallow, sunriseDeep, foam, fogColor, fogNear, fogFar, moonDir, sunDir, waveHeight],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uCameraPos.value.copy(camera.position);
    if (getSunrise) uniforms.uSunrise.value = getSunrise();
    if (getFogColor) getFogColor(uniforms.uFogColor.value);
  });

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
      <planeGeometry args={[size, size, segs, segs]} />
      <shaderMaterial vertexShader={waterVertex} fragmentShader={waterFragment} uniforms={uniforms} />
    </mesh>
  );
}

/** Height of the ocean surface at (x, z) — mirrors the first Gerstner waves so boats bob correctly. */
export function waterHeightAt(x: number, z: number, time: number, waveHeight = 1): number {
  const wave = (dx: number, dz: number, steep: number, wavelength: number, speed: number) => {
    const k = (Math.PI * 2) / wavelength;
    const c = Math.sqrt(9.8 / k) * speed;
    const len = Math.hypot(dx, dz);
    const ddx = dx / len;
    const ddz = dz / len;
    const f = k * (ddx * x + ddz * z - c * time);
    return (steep / k) * Math.sin(f);
  };
  return (
    wave(1, 0.6, 0.12 * waveHeight, 14, 0.5) +
    wave(-0.7, 1, 0.1 * waveHeight, 9, 0.6) +
    wave(0.3, -1, 0.08 * waveHeight, 5, 0.7) +
    wave(-1, -0.2, 0.05 * waveHeight, 2.6, 0.9)
  );
}
