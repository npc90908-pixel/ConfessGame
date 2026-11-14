"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "@/game/engine/fx";
import { portalFragment, portalVertex } from "@/lib/shaders/portal";
import { Particles } from "./Particles";

export interface PortalProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  radius?: number;
  colorA?: string;
  colorB?: string;
  rim?: string;
  /** Reads fx.portalPower when omitted. */
  power?: () => number;
}

/**
 * Standing portal: stone arch, swirling shader disc, rim light, floating
 * runes and rising sparks. Intensity follows `fx.portalPower` (0 = dormant).
 */
export function Portal({ position, rotation = [0, 0, 0], radius = 2.2, colorA = "#5b3aa8", colorB = "#ff6fa3", rim = "#ffd6e7", power }: PortalProps) {
  const disc = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const runes = useRef<THREE.Group>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPower: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uColorRim: { value: new THREE.Color(rim) },
    }),
    [colorA, colorB, rim],
  );
  const stones = useMemo(() => {
    const list: Array<{ angle: number; scale: number }> = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      list.push({ angle: Math.PI * (1 - t), scale: 0.8 + Math.sin(t * Math.PI) * 0.35 });
    }
    return list;
  }, []);

  useFrame(({ clock }, dt) => {
    const p = power ? power() : fx.portalPower;
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uPower.value = THREE.MathUtils.damp(uniforms.uPower.value, p, 3, dt);
    if (light.current) light.current.intensity = 2 + uniforms.uPower.value * 22;
    if (runes.current) {
      runes.current.rotation.y = clock.elapsedTime * 0.35;
      runes.current.visible = uniforms.uPower.value > 0.05;
      runes.current.scale.setScalar(0.6 + uniforms.uPower.value * 0.4);
    }
  });

  const R = radius;
  return (
    <group position={position} rotation={rotation}>
      {/* stone arch */}
      {stones.map((s, i) => (
        <mesh key={i} position={[Math.cos(s.angle) * (R + 0.5), Math.sin(s.angle) * (R + 0.5) + 0.2, 0]} rotation={[0, 0, s.angle - Math.PI / 2]} scale={[s.scale, 1, 1]} castShadow>
          <boxGeometry args={[0.7, 0.9, 0.7]} />
          <meshStandardMaterial color="#4a3f66" roughness={0.95} />
        </mesh>
      ))}
      {/* pillars */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (R + 0.5), 0, 0]}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.6, 0.5, 8]} />
            <meshStandardMaterial color="#3d3356" roughness={1} />
          </mesh>
          <mesh position={[0, R * 0.5 + 0.2, 0]} castShadow>
            <boxGeometry args={[0.7, R, 0.7]} />
            <meshStandardMaterial color="#4a3f66" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* disc */}
      <mesh ref={disc} position={[0, R + 0.2, 0]}>
        <circleGeometry args={[R, 48]} />
        <shaderMaterial vertexShader={portalVertex} fragmentShader={portalFragment} uniforms={uniforms} transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* floating runes */}
      <group ref={runes} position={[0, R + 0.2, 0]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[Math.cos((i / 8) * Math.PI * 2) * (R + 0.9), Math.sin((i / 8) * Math.PI * 2) * (R + 0.9), 0]} rotation={[0, 0, (i / 8) * Math.PI * 2]}>
            <planeGeometry args={[0.22, 0.22]} />
            <meshBasicMaterial color={rim} transparent opacity={0.8} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, R + 0.2, 1.2]} color={colorB} intensity={2} distance={18} decay={2} />
      <Particles count={60} texture="spark" color={[rim, colorB]} size={[0.06, 0.18]} area={[R * 2.4, R * 2.4, 1.5]} center={[0, R + 0.2, 0]} velocity={[0, 0.5, 0]} jitter={0.4} sway={0.3} twinkle={1.4} seed={5} getOpacity={() => uniforms.uPower.value} />
    </group>
  );
}
