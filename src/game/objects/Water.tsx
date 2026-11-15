"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { TEXTURES } from "@/config/assets";
import { useQuality } from "@/game/systems/quality";
import { streamFragment, streamVertex } from "@/lib/shaders/stream";
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

/* -------------------------------------------------------------------------- */
/*  Stream                                                                    */
/* -------------------------------------------------------------------------- */

export interface StreamProps {
  /** Centreline z for a given x (world space). */
  centerZ: (x: number) => number;
  /** Surface height for a given (x, z). */
  surfaceY: (x: number, z: number) => number;
  xMin: number;
  xMax: number;
  halfWidth: number;
  segments?: number;
  deep?: string;
  shallow?: string;
  foam?: string;
  opacity?: number;
  /** Flow direction along +x (1) or −x (−1). */
  flow?: 1 | -1;
}

/**
 * A ribbon mesh that follows a meandering centreline, shaded with the stream
 * shader. Cheap: no displacement, one draw call, additive-free transparency.
 */
export function Stream({ centerZ, surfaceY, xMin, xMax, halfWidth, segments = 96, deep = "#1d3d6a", shallow = "#5aa7d8", foam = "#eaf7ff", opacity = 0.82, flow = 1 }: StreamProps) {
  const geometry = useMemo(() => {
    const cols = segments + 1;
    const positions = new Float32Array(cols * 2 * 3);
    const uvs = new Float32Array(cols * 2 * 2);
    const index: number[] = [];
    for (let i = 0; i < cols; i++) {
      const x = xMin + ((xMax - xMin) * i) / segments;
      const zc = centerZ(x);
      // local tangent → perpendicular so the ribbon keeps its width on bends
      const dz = centerZ(x + 0.01) - zc;
      const len = Math.hypot(0.01, dz);
      const nx = -dz / len;
      const nz = 0.01 / len;
      for (let side = 0; side < 2; side++) {
        const s = side === 0 ? -1 : 1;
        const px = x + nx * halfWidth * s;
        const pz = zc + nz * halfWidth * s;
        const vi = (i * 2 + side) * 3;
        positions[vi] = px;
        positions[vi + 1] = surfaceY(px, pz);
        positions[vi + 2] = pz;
        const ui = (i * 2 + side) * 2;
        uvs[ui] = i / segments;
        uvs[ui + 1] = side;
      }
      if (i < segments) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [centerZ, surfaceY, xMin, xMax, halfWidth, segments]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFlow: { value: new THREE.Vector2(flow, 0) },
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uFoam: { value: new THREE.Color(foam) },
      uOpacity: { value: opacity },
    }),
    [deep, shallow, foam, opacity, flow],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial vertexShader={streamVertex} fragmentShader={streamFragment} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}
