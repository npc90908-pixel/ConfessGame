"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { CONTROLS } from "@/config/controls";
import { PARTICLES } from "@/config/assets";
import { runtime } from "@/game/engine/runtime";
import { damp, lerp } from "@/lib/math";

export interface CharacterProps {
  /** When true (default) the character follows runtime.player every frame. */
  driven?: boolean;
  sitting?: boolean;
  /** Scale override for showcase usage. */
  scale?: number;
  /** Emit the lantern point light (disable where many lights exist). */
  lantern?: boolean;
  castShadow?: boolean;
}

const COLORS = {
  cloak: "#8d79dd",
  cloakInner: "#5f4bb6",
  tunic: "#c9bcff",
  scarf: "#ff6fa3",
  skin: "#f7d9c6",
  hair: "#3b2a4f",
  boots: "#3a2a4f",
  lanternMetal: "#4a3a2a",
  lanternGlass: "#ffd98a",
  blush: "#ff9fb0",
};

/**
 * "The Traveller" — a stylised chibi explorer built from primitives with a
 * procedural animation rig (idle / walk / run / jump / sit). No external
 * model files are required, so it loads instantly and never breaks.
 */
export function Character({ driven = true, sitting = false, scale = 1, lantern = true, castShadow = true }: CharacterProps) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const scarfTail = useRef<THREE.Mesh>(null);
  const cloak = useRef<THREE.Mesh>(null);
  const lanternRef = useRef<THREE.Group>(null);
  const lanternLight = useRef<THREE.PointLight>(null);
  const glow = useTexture(PARTICLES.glow);

  const state = useRef({ phase: 0, walk: 0, air: 0 });

  const materials = useMemo(
    () => ({
      cloak: new THREE.MeshStandardMaterial({ color: COLORS.cloak, roughness: 0.75, side: THREE.DoubleSide }),
      tunic: new THREE.MeshStandardMaterial({ color: COLORS.tunic, roughness: 0.7 }),
      scarf: new THREE.MeshStandardMaterial({ color: COLORS.scarf, roughness: 0.6, emissive: COLORS.scarf, emissiveIntensity: 0.12 }),
      skin: new THREE.MeshStandardMaterial({ color: COLORS.skin, roughness: 0.65 }),
      hair: new THREE.MeshStandardMaterial({ color: COLORS.hair, roughness: 0.55 }),
      boots: new THREE.MeshStandardMaterial({ color: COLORS.boots, roughness: 0.8 }),
      eye: new THREE.MeshBasicMaterial({ color: "#1b1226" }),
      eyeShine: new THREE.MeshBasicMaterial({ color: "#ffffff" }),
      blush: new THREE.MeshBasicMaterial({ color: COLORS.blush, transparent: true, opacity: 0.55 }),
      lanternMetal: new THREE.MeshStandardMaterial({ color: COLORS.lanternMetal, roughness: 0.5, metalness: 0.6 }),
      lanternGlass: new THREE.MeshStandardMaterial({
        color: COLORS.lanternGlass,
        emissive: COLORS.lanternGlass,
        emissiveIntensity: 2.2,
        roughness: 0.2,
        transparent: true,
        opacity: 0.9,
      }),
      shadow: new THREE.MeshBasicMaterial({ map: glow, color: "#000000", transparent: true, opacity: 0.38, depthWrite: false }),
    }),
    [glow],
  );

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const t = clock.elapsedTime;
    const p = runtime.player;
    const s = state.current;

    if (root.current && driven) {
      root.current.position.copy(p.position);
      root.current.rotation.y = p.yaw;
      const sc = p.scale * scale;
      root.current.scale.setScalar(sc);
      root.current.visible = p.visible && p.mode !== "none";
    }

    const targetWalk = sitting ? 0 : Math.min(1, p.speed / CONTROLS.player.walkSpeed);
    s.walk = lerp(s.walk, targetWalk, damp(10, dt));
    const targetAir = sitting || p.grounded ? 0 : 1;
    s.air = lerp(s.air, targetAir, damp(12, dt));
    const stride = 2.2 + Math.min(1.4, p.speed / CONTROLS.player.walkSpeed) * 1.6;
    if (!sitting) s.phase += p.speed * dt * stride * 0.9;
    const w = s.walk;
    const air = s.air;
    const swing = Math.sin(s.phase);

    if (legL.current && legR.current) {
      const sitAngle = sitting ? -1.45 : 0;
      legL.current.rotation.x = lerp(swing * 0.85 * w + sitAngle, -0.7, air);
      legR.current.rotation.x = lerp(-swing * 0.85 * w + sitAngle, 0.35, air);
    }
    if (armL.current && armR.current) {
      const idleSway = Math.sin(t * 1.4) * 0.06;
      const sitArm = sitting ? 0.5 : 0;
      armL.current.rotation.x = lerp(-swing * 0.7 * w + idleSway + sitArm, -2.3, air);
      armR.current.rotation.x = lerp(swing * 0.7 * w - idleSway + sitArm, -2.3, air);
      armL.current.rotation.z = 0.18 + w * 0.05;
      armR.current.rotation.z = -0.18 - w * 0.05;
    }
    if (body.current) {
      const bob = Math.abs(Math.sin(s.phase)) * 0.055 * w + Math.sin(t * 2.1) * 0.012;
      body.current.position.y = 0.46 + bob - air * 0.05;
      body.current.rotation.x = lerp(0.14 * w, -0.1, air);
      body.current.rotation.z = Math.sin(s.phase * 0.5) * 0.03 * w;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.7) * 0.1 * (1 - w) ;
      head.current.rotation.z = Math.sin(t * 1.1) * 0.03;
      head.current.rotation.x = -0.05 * w;
    }
    if (scarfTail.current) {
      scarfTail.current.rotation.x = -0.35 - w * 0.9 + Math.sin(t * 6) * 0.12 * w + Math.sin(t * 1.8) * 0.08;
      scarfTail.current.rotation.z = Math.sin(t * 2.3) * 0.1;
    }
    if (cloak.current) {
      cloak.current.rotation.x = -0.05 - w * 0.22 + Math.sin(t * 2) * 0.02;
      cloak.current.scale.z = 1 + w * 0.08 + air * 0.2;
    }
    if (lanternRef.current) {
      lanternRef.current.rotation.z = Math.sin(t * 2.6 + s.phase) * 0.18 * (0.35 + w);
      lanternRef.current.rotation.x = Math.sin(t * 1.7) * 0.08;
    }
    if (lanternLight.current) {
      lanternLight.current.intensity = 7 + Math.sin(t * 9) * 0.6 + Math.sin(t * 23) * 0.3;
    }
  });

  return (
    <group ref={root} dispose={null}>
      {/* contact shadow blob */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} material={materials.shadow} renderOrder={-1}>
        <planeGeometry args={[1.3, 1.3]} />
      </mesh>

      {/* legs */}
      <group ref={legL} position={[-0.11, 0.46, 0]}>
        <mesh position-y={-0.2} material={materials.tunic} castShadow={castShadow}>
          <capsuleGeometry args={[0.085, 0.24, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.4, 0.04]} material={materials.boots} castShadow={castShadow}>
          <boxGeometry args={[0.17, 0.12, 0.26]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.11, 0.46, 0]}>
        <mesh position-y={-0.2} material={materials.tunic} castShadow={castShadow}>
          <capsuleGeometry args={[0.085, 0.24, 6, 12]} />
        </mesh>
        <mesh position={[0, -0.4, 0.04]} material={materials.boots} castShadow={castShadow}>
          <boxGeometry args={[0.17, 0.12, 0.26]} />
        </mesh>
      </group>

      {/* torso group (bobs) */}
      <group ref={body} position-y={0.46}>
        <mesh position-y={0.28} material={materials.tunic} castShadow={castShadow}>
          <capsuleGeometry args={[0.23, 0.3, 8, 16]} />
        </mesh>
        {/* cloak */}
        <mesh ref={cloak} position={[0, 0.2, -0.02]} material={materials.cloak} castShadow={castShadow}>
          <coneGeometry args={[0.4, 0.78, 20, 1, true]} />
        </mesh>
        {/* scarf */}
        <mesh position-y={0.6} rotation-x={Math.PI / 2} material={materials.scarf} castShadow={castShadow}>
          <torusGeometry args={[0.2, 0.075, 10, 20]} />
        </mesh>
        <mesh ref={scarfTail} position={[0.08, 0.56, -0.2]} material={materials.scarf}>
          <planeGeometry args={[0.14, 0.48]} />
        </mesh>

        {/* arms */}
        <group ref={armL} position={[-0.3, 0.5, 0]}>
          <mesh position-y={-0.17} material={materials.cloak} castShadow={castShadow}>
            <capsuleGeometry args={[0.07, 0.26, 6, 12]} />
          </mesh>
          <mesh position-y={-0.36} material={materials.skin}>
            <sphereGeometry args={[0.075, 12, 12]} />
          </mesh>
        </group>
        <group ref={armR} position={[0.3, 0.5, 0]}>
          <mesh position-y={-0.17} material={materials.cloak} castShadow={castShadow}>
            <capsuleGeometry args={[0.07, 0.26, 6, 12]} />
          </mesh>
          <mesh position-y={-0.36} material={materials.skin}>
            <sphereGeometry args={[0.075, 12, 12]} />
          </mesh>
          {/* lantern */}
          <group ref={lanternRef} position={[0.02, -0.42, 0.06]}>
            <mesh position-y={-0.08} material={materials.lanternMetal}>
              <cylinderGeometry args={[0.02, 0.02, 0.1, 6]} />
            </mesh>
            <mesh position-y={-0.26} material={materials.lanternMetal}>
              <cylinderGeometry args={[0.1, 0.12, 0.05, 8]} />
            </mesh>
            <mesh position-y={-0.2} material={materials.lanternGlass}>
              <cylinderGeometry args={[0.07, 0.085, 0.14, 8]} />
            </mesh>
            <mesh position-y={-0.1} material={materials.lanternMetal}>
              <cylinderGeometry args={[0.03, 0.11, 0.06, 8]} />
            </mesh>
            {lantern && (
              <pointLight ref={lanternLight} position-y={-0.2} color="#ffcf7a" intensity={7} distance={7} decay={2} />
            )}
          </group>
        </group>

        {/* head */}
        <group ref={head} position-y={0.92}>
          <mesh material={materials.skin} castShadow={castShadow}>
            <sphereGeometry args={[0.3, 28, 20]} />
          </mesh>
          {/* hair cap tilted backwards so the face stays visible */}
          <mesh position={[0, 0.06, -0.03]} rotation-x={-0.55} material={materials.hair} castShadow={castShadow}>
            <sphereGeometry args={[0.325, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          </mesh>
          {/* fringe */}
          <mesh position={[0.12, 0.17, 0.22]} rotation={[0.5, 0.3, 0.4]} material={materials.hair}>
            <capsuleGeometry args={[0.05, 0.12, 4, 8]} />
          </mesh>
          {/* eyes */}
          <mesh position={[-0.105, 0.02, 0.27]} material={materials.eye}>
            <sphereGeometry args={[0.038, 12, 12]} />
          </mesh>
          <mesh position={[0.105, 0.02, 0.27]} material={materials.eye}>
            <sphereGeometry args={[0.038, 12, 12]} />
          </mesh>
          <mesh position={[-0.092, 0.035, 0.302]} material={materials.eyeShine}>
            <sphereGeometry args={[0.012, 8, 8]} />
          </mesh>
          <mesh position={[0.118, 0.035, 0.302]} material={materials.eyeShine}>
            <sphereGeometry args={[0.012, 8, 8]} />
          </mesh>
          {/* blush */}
          <mesh position={[-0.18, -0.06, 0.22]} rotation-y={-0.5} material={materials.blush}>
            <circleGeometry args={[0.045, 12]} />
          </mesh>
          <mesh position={[0.18, -0.06, 0.22]} rotation-y={0.5} material={materials.blush}>
            <circleGeometry args={[0.045, 12]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
