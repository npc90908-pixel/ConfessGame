"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { useAnimations, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CONTROLS } from "@/config/controls";
import { PARTICLES } from "@/config/assets";
import { CHARACTER_MODELS, MODELS, type CharacterModelId } from "@/config/models";
import { runtime } from "@/game/engine/runtime";
import { useQuality } from "@/game/systems/quality";
import { damp, lerp } from "@/lib/math";
import { Model, useModel } from "./Model";

export interface CharacterProps {
  /** When true (default) the character follows runtime.player every frame. */
  driven?: boolean;
  sitting?: boolean;
  /** Scale override for showcase usage. */
  scale?: number;
  /** Emit the lantern point light (disable where many lights exist). */
  lantern?: boolean;
  castShadow?: boolean;
  /** Which Kenney mini-character to use. */
  model?: CharacterModelId;
}

/** The traveller's default look. */
export const PLAYER_MODEL: CharacterModelId = "character-female-b";

/** Kenney mini-characters are ~0.8 m tall; scale them to a readable 1.5 m. */
const CHARACTER_SCALE = 1.85;

const qBone = new THREE.Quaternion();
const qRoot = new THREE.Quaternion();
const qSwing = new THREE.Quaternion();
const eSwing = new THREE.Euler();

type Pose = "idle" | "walk" | "sprint" | "jump" | "fall" | "sit";

/**
 * "The Traveller" — an animated Kenney mini-character (CC0) driven by the
 * player runtime: idle / walk / sprint / jump / fall / sit clips are
 * cross-faded from the controller's speed and grounded state, and a small
 * hanging lantern swings from the right hand.
 */
export function Character({ driven = true, sitting: sittingProp = false, scale = 1, lantern = true, castShadow = true, model = PLAYER_MODEL }: CharacterProps) {
  const root = useRef<THREE.Group>(null);
  const lanternRef = useRef<THREE.Group>(null);
  const lanternLight = useRef<THREE.PointLight>(null);
  const glow = useTexture(PARTICLES.glow);
  const { preset } = useQuality();
  const gltf = useModel(CHARACTER_MODELS[model]);

  const scene = useMemo(() => {
    const s = cloneSkeleton(gltf.scene) as THREE.Group;
    s.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.frustumCulled = false;
      }
    });
    return s;
  }, [gltf.scene]);
  const { actions, mixer } = useAnimations(gltf.animations, scene);
  const shadows = castShadow && preset.shadows;

  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = shadows;
        obj.receiveShadow = false;
      }
    });
  }, [scene, shadows]);

  // Hook the lantern onto the right arm bone so it swings with the walk cycle.
  const lanternAnchor = useMemo(() => scene.getObjectByName("arm-right") ?? scene, [scene]);

  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ map: glow, color: "#000000", transparent: true, opacity: 0.38, depthWrite: false }), [glow]);

  const state = useRef<{ pose: Pose | null; walk: number; air: number }>({ pose: null, walk: 0, air: 0 });

  useEffect(() => {
    const idle = actions.idle;
    if (idle) {
      idle.reset().play();
      state.current.pose = "idle";
    }
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const t = clock.elapsedTime;
    const p = runtime.player;
    const s = state.current;
    // Sitting is forced while the player drives the boat.
    const sitting = sittingProp || (driven && p.mode === "boat");

    if (root.current && driven) {
      root.current.position.copy(p.position);
      root.current.rotation.y = p.yaw;
      root.current.scale.setScalar(p.scale * scale);
      root.current.visible = p.visible && p.mode !== "none";
    }

    const speed = driven ? p.speed : 0;
    const grounded = driven ? p.grounded : true;
    const targetWalk = sitting ? 0 : Math.min(1, speed / CONTROLS.player.walkSpeed);
    s.walk = lerp(s.walk, targetWalk, damp(10, dt));
    s.air = lerp(s.air, sitting || grounded ? 0 : 1, damp(12, dt));

    let pose: Pose;
    if (sitting) pose = "sit";
    else if (!grounded) pose = p.velocity.y > 0.5 ? "jump" : "fall";
    else if (speed > CONTROLS.player.walkSpeed * 1.15) pose = "sprint";
    else if (speed > 0.35) pose = "walk";
    else pose = "idle";

    if (pose !== s.pose) {
      const next = actions[pose] ?? actions.idle;
      const prev = s.pose ? actions[s.pose] : null;
      if (next) {
        next.reset();
        next.enabled = true;
        if (pose === "jump" || pose === "sit") {
          next.setLoop(THREE.LoopOnce, 1);
          next.clampWhenFinished = true;
        } else {
          next.setLoop(THREE.LoopRepeat, Infinity);
        }
        if (prev && prev !== next) prev.fadeOut(0.18);
        next.fadeIn(0.18).play();
      }
      s.pose = pose;
    }
    // Feet follow the actual ground speed instead of sliding.
    const walk = actions.walk;
    if (walk) walk.timeScale = THREE.MathUtils.clamp(speed / 2.6, 0.6, 1.9);
    const sprint = actions.sprint;
    if (sprint) sprint.timeScale = THREE.MathUtils.clamp(speed / 4.6, 0.8, 1.6);

    if (lanternRef.current && root.current) {
      // Keep the lantern hanging upright from the swinging arm bone, plus a little pendulum motion.
      eSwing.set(Math.sin(t * 1.7) * 0.1 + s.walk * 0.25, 0, Math.sin(t * 2.6) * 0.18 * (0.35 + s.walk) + Math.sin(t * 1.3) * 0.05);
      qSwing.setFromEuler(eSwing);
      lanternAnchor.getWorldQuaternion(qBone);
      root.current.getWorldQuaternion(qRoot);
      lanternRef.current.quaternion.copy(qBone).invert().multiply(qRoot).multiply(qSwing);
    }
    if (lanternLight.current) {
      lanternLight.current.intensity = 7 + Math.sin(t * 9) * 0.6 + Math.sin(t * 23) * 0.3;
    }
  });

  return (
    <group ref={root} dispose={null}>
      {/* contact shadow blob */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.03} material={shadowMat} renderOrder={-1}>
        <planeGeometry args={[1.3, 1.3]} />
      </mesh>
      <group scale={CHARACTER_SCALE}>
        <primitive object={scene} />
      </group>
      {/* Lantern hooked to the right arm bone so it swings with the animation (model units: parent scales 1.85×). */}
      {createPortal(
        <group ref={lanternRef} position={[-0.2, -0.01, 0.02]}>
          <Model url={MODELS.holidayLanternHanging} scale={0.3} castShadow={false} receiveShadow={false} />
          <mesh position={[0, -0.11, 0]}>
            <boxGeometry args={[0.06, 0.07, 0.06]} />
            <meshStandardMaterial color="#ffd98a" emissive="#ffd98a" emissiveIntensity={2.4} roughness={0.2} transparent opacity={0.9} />
          </mesh>
          {lantern && <pointLight ref={lanternLight} position={[0, -0.11, 0.08]} color="#ffcf7a" intensity={7} distance={7} decay={2} />}
        </group>,
        lanternAnchor,
      )}
    </group>
  );
}
