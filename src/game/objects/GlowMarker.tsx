"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { beamFragment, beamVertex } from "@/lib/shaders/portal";
import type { Vec3 } from "@/game/scenes/landmarks";

export interface LightBeamProps {
  color?: string;
  height?: number;
  radius?: number;
  opacity?: number;
  position?: Vec3;
}

/** Soft vertical beam of light (additive, fades out upward). */
export function LightBeam({ color = "#ffd27a", height = 6, radius = 0.6, opacity = 0.5, position = [0, 0, 0] }: LightBeamProps) {
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uOpacity.value = opacity;
  });
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]} renderOrder={5}>
      <cylinderGeometry args={[radius * 0.7, radius, height, 24, 1, true]} />
      <shaderMaterial
        vertexShader={beamVertex}
        fragmentShader={beamFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export interface GlowMarkerProps {
  position: Vec3;
  color?: string;
  radius?: number;
  active?: boolean;
  /** Called every frame with the marker's pulsing intensity (0..1). */
  beam?: boolean;
}

/** Objective marker: pulsing ring on the ground, light beam and sparkles. */
export function GlowMarker({ position, color = "#ffd27a", radius = 1.2, active = true, beam = true }: GlowMarkerProps) {
  const ring = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const group = useRef<THREE.Group>(null);
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (group.current) {
      const target = active ? 1 : 0;
      const s = THREE.MathUtils.damp(group.current.scale.x, target, 6, dt);
      group.current.scale.setScalar(Math.max(0.0001, s));
      group.current.visible = s > 0.01;
    }
    if (ring.current) {
      const pulse = 1 + Math.sin(t * 2.4) * 0.08;
      ring.current.scale.setScalar(pulse);
      ring.current.rotation.z = t * 0.4;
    }
    if (ring2.current) {
      const k = (t * 0.6) % 1;
      ring2.current.scale.setScalar(1 + k * 0.9);
      (ring2.current.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.5;
    }
    if (light.current) light.current.intensity = 3 + Math.sin(t * 3) * 0.8;
  });

  return (
    <group ref={group} position={position}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.06} renderOrder={4}>
        <ringGeometry args={[radius * 0.72, radius, 48]} />
        <meshBasicMaterial color={colorObj} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2} rotation-x={-Math.PI / 2} position-y={0.05} renderOrder={4}>
        <ringGeometry args={[radius * 0.9, radius, 48]} />
        <meshBasicMaterial color={colorObj} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.04} renderOrder={3}>
        <circleGeometry args={[radius * 0.7, 32]} />
        <meshBasicMaterial color={colorObj} transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {beam && <LightBeam color={color} height={7} radius={radius * 0.55} opacity={0.35} />}
      <Sparkles count={14} scale={[radius * 2, 3, radius * 2]} position-y={1.5} size={3} speed={0.6} color={color} opacity={0.8} />
      <pointLight ref={light} color={colorObj} intensity={3} distance={6} decay={2} position-y={1} />
    </group>
  );
}
