"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail } from "@react-three/drei";
import * as THREE from "three";
import { CONTROLS } from "@/config/controls";
import { story } from "@/config/story";
import { fx } from "@/game/engine/fx";
import { game } from "@/game/engine/GameManager";
import { getMoveAxis } from "@/game/engine/input";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { circle, setWorld } from "@/game/engine/world";
import { Collectible } from "@/game/objects/Collectible";
import { GlowMarker, LightBeam } from "@/game/objects/GlowMarker";
import { Particles } from "@/game/objects/Particles";
import { SkyDome, type SkyPalette } from "@/game/objects/SkyDome";
import { Rocks, scatter } from "@/game/objects/Flora";
import { Water, waterHeightAt } from "@/game/objects/Water";
import { audio } from "@/game/systems/audio/AudioManager";
import { useQuality } from "@/game/systems/quality";
import { useProgressStore } from "@/store/progressStore";
import { selectControlsLocked, useUIStore } from "@/store/uiStore";
import { clamp, damp, lerp } from "@/lib/math";
import { OCEAN } from "../landmarks";
import type { SceneId } from "@/types/game";

const SHORE = { x: 0, z: 9, r: 8 };
const PIER = { x: 0, zStart: OCEAN.pierStart[2], zEnd: OCEAN.pierEnd[2], hw: OCEAN.pierWidth / 2, y: OCEAN.pierHeight };
const SHRINE_ROCK_R = 7;

const onPier = (x: number, z: number) => Math.abs(x - PIER.x) < PIER.hw && z < PIER.zStart + 0.5 && z > PIER.zEnd - 0.4;
const onShore = (x: number, z: number) => Math.hypot(x - SHORE.x, z - SHORE.z) < SHORE.r - 0.8;
const getHeight = (x: number, z: number) => {
  if (onPier(x, z)) return PIER.y;
  const d = Math.hypot(x - SHORE.x, z - SHORE.z);
  return Math.max(0.15, 0.9 - (d / SHORE.r) * 0.75);
};
const isWalkable = (x: number, z: number) => onPier(x, z) || onShore(x, z);

const NIGHT: SkyPalette = {
  top: "#040312",
  horizon: "#17123f",
  bottom: "#03020a",
  nebulaA: "#2a1f6e",
  nebulaB: "#4a2a8a",
  nebula: 0.6,
  stars: 1.2,
  sun: 0,
  sunColor: "#ffb48a",
  sunDir: [0.2, 0.08, -1],
  sunSize: 0.05,
  moon: 1,
  moonDir: OCEAN.moonDirection,
};
const SUNRISE = { top: new THREE.Color("#3a2a6a"), horizon: new THREE.Color("#ff9a7a"), bottom: new THREE.Color("#2a1a4a") };
const NIGHT_C = { top: new THREE.Color(NIGHT.top), horizon: new THREE.Color(NIGHT.horizon), bottom: new THREE.Color(NIGHT.bottom) };
const FOG_NIGHT = new THREE.Color("#0a0a24");
const FOG_SUNRISE = new THREE.Color("#8a4a6a");

const BOAT_SCENES: SceneId[] = ["sail-with-me", "message-bottles", "star-puzzle", "beyond-horizon"];
const boatStartFor = (id: SceneId): [number, number, number] => {
  switch (id) {
    case "message-bottles":
      return [OCEAN.marker[0], 0, OCEAN.marker[2] - 4];
    case "star-puzzle":
      return [OCEAN.bottles[2][0], 0, OCEAN.bottles[2][2] - 6];
    case "beyond-horizon":
      return [OCEAN.shrine[0] + 10, 0, OCEAN.shrine[2] + 14];
    default:
      return [OCEAN.boatMoor[0], 0, OCEAN.boatMoor[2]];
  }
};

/* -------------------------------------------------------------------------- */
/*  Boat + controller                                                         */
/* -------------------------------------------------------------------------- */

const axis = { x: 0, y: 0 };

function Boat() {
  const group = useRef<THREE.Group>(null);
  const stern = useRef<THREE.Object3D>(null);
  const lanternMat = useRef<THREE.MeshStandardMaterial>(null);
  const sceneId = useProgressStore((s) => s.sceneId);
  const cfg = CONTROLS.boat;

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const p = runtime.player;
    const b = p.boat;
    const t = clock.elapsedTime;
    const locked = selectControlsLocked(useUIStore.getState());
    const driving = p.mode === "boat";

    if (driving) {
      getMoveAxis(axis);
      if (locked) {
        axis.x = 0;
        axis.y = 0;
      }
      b.throttle = lerp(b.throttle, clamp(axis.y, -0.5, 1), damp(4, dt));
      const targetSpeed = b.throttle * cfg.maxSpeed;
      b.speed = lerp(b.speed, targetSpeed, damp(targetSpeed === 0 ? cfg.drag : cfg.acceleration * 0.4, dt));
      const steer = -axis.x * cfg.turnSpeed * (0.35 + Math.min(1, Math.abs(b.speed) / cfg.maxSpeed) * 0.65);
      b.turnRate = lerp(b.turnRate, steer, damp(5, dt));
      b.heading += b.turnRate * dt * (b.speed < -0.1 ? -1 : 1);

      const nx = p.position.x - Math.sin(b.heading) * b.speed * dt;
      const nz = p.position.z - Math.cos(b.heading) * b.speed * dt;
      // Stay inside the sailing bounds and off the rocks.
      const dxB = nx - OCEAN.boundsCenter[0];
      const dzB = nz - OCEAN.boundsCenter[2];
      const distB = Math.hypot(dxB, dzB);
      let fx2 = nx;
      let fz2 = nz;
      if (distB > OCEAN.boundsRadius) {
        fx2 = OCEAN.boundsCenter[0] + (dxB / distB) * OCEAN.boundsRadius;
        fz2 = OCEAN.boundsCenter[2] + (dzB / distB) * OCEAN.boundsRadius;
        b.speed *= 0.5;
      }
      const blockers = [
        { x: SHORE.x, z: SHORE.z, r: SHORE.r + 1.5 },
        { x: OCEAN.shrine[0], z: OCEAN.shrine[2], r: SHRINE_ROCK_R + 2 },
      ];
      for (const bl of blockers) {
        const dx = fx2 - bl.x;
        const dz = fz2 - bl.z;
        const d = Math.hypot(dx, dz);
        if (d < bl.r) {
          fx2 = bl.x + (dx / d) * bl.r;
          fz2 = bl.z + (dz / d) * bl.r;
          b.speed *= 0.6;
        }
      }
      // The pier blocks the boat as well.
      if (Math.abs(fx2) < PIER.hw + 1.4 && fz2 > PIER.zEnd - 1.4 && fz2 < PIER.zStart + 1) {
        fz2 = PIER.zEnd - 1.4;
        b.speed *= 0.5;
      }
      p.position.x = fx2;
      p.position.z = fz2;
      p.yaw = b.heading;
      p.speed = Math.abs(b.speed);
      p.moving = p.speed > 0.2;
      audio.setLoopVolume("boat-loop", 0.15 + Math.min(1, p.speed / cfg.maxSpeed) * 0.55);
    }

    // Bob on the waves whether or not someone is aboard.
    const g = group.current;
    if (!g) return;
    const bx = driving ? p.position.x : OCEAN.boatMoor[0];
    const bz = driving ? p.position.z : OCEAN.boatMoor[2];
    const h = waterHeightAt(bx, bz, t);
    const hx = waterHeightAt(bx + 1.2, bz, t);
    const hz = waterHeightAt(bx, bz + 1.2, t);
    g.position.set(bx, h + 0.22, bz);
    const heading = driving ? b.heading : Math.PI;
    g.rotation.set((hz - h) * 0.5 - (driving ? b.throttle * 0.03 : 0), heading, -(hx - h) * 0.5 + (driving ? b.turnRate * 0.08 : 0));
    if (driving) p.position.y = h + 0.5;
    if (lanternMat.current) lanternMat.current.emissiveIntensity = 1.6 + Math.sin(t * 3.1) * 0.3;
  });

  const pos = useMemo(() => new THREE.Vector3(OCEAN.boatMoor[0], 0.5, OCEAN.boatMoor[2]), []);
  useInteractable(
    sceneId === "silent-ocean"
      ? {
          id: "boat",
          position: pos,
          radius: 3.2,
          label: "Naik perahu",
          icon: "compass",
          priority: 8,
          onInteract: () => {
            const p = runtime.player;
            p.mode = "boat";
            p.position.set(OCEAN.boatMoor[0], 0.5, OCEAN.boatMoor[2]);
            p.boat.heading = Math.PI;
            p.boat.speed = 0;
            runtime.camera.mode = "boat";
            audio.sfx("whoosh", { volume: 0.6 });
            audio.startLoop("boat-loop", 0.15, 1200);
            game.advanceObjective("board-boat", { delay: 600 });
          },
        }
      : null,
  );

  return (
    <group ref={group} onClick={(e) => (e.stopPropagation(), triggerInteraction("boat"))}>
      {/* hull */}
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.9, 2.6, 6, 12]} />
        <meshStandardMaterial color="#5a3a2a" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.25, 0]} scale={[0.86, 0.5, 0.92]}>
        <capsuleGeometry args={[0.9, 2.6, 6, 12]} />
        <meshStandardMaterial color="#2a1a14" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.09, 8, 28]} scale={[1, 2.2, 1]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.8} />
      </mesh>
      {/* bench + lantern pole at the bow */}
      <mesh position={[0, 0.45, 0.2]}>
        <boxGeometry args={[1.5, 0.08, 0.5]} />
        <meshStandardMaterial color="#8a5a3a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.2, -1.9]}>
        <cylinderGeometry args={[0.04, 0.05, 1.6, 6]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      <mesh position={[0, 2.0, -1.9]}>
        <boxGeometry args={[0.26, 0.3, 0.26]} />
        <meshStandardMaterial ref={lanternMat} color="#ffd27a" emissive="#ffd27a" emissiveIntensity={1.6} transparent opacity={0.92} />
      </mesh>
      <pointLight position={[0, 2.0, -1.9]} color="#ffd27a" intensity={5} distance={10} decay={2} />
      {/* wake */}
      <object3D ref={stern} position={[0, -0.1, 1.9]} />
      <Trail width={1.6} length={10} decay={1.2} color="#dff3ff" attenuation={(w) => w * w} target={stern as React.RefObject<THREE.Object3D>} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shore, pier, shrine                                                       */
/* -------------------------------------------------------------------------- */

function Shore() {
  const rocks = useMemo(() => scatter({ count: 10, seed: 301, area: (x, z) => Math.hypot(x - SHORE.x, z - SHORE.z) < SHORE.r - 1 && Math.hypot(x - SHORE.x, z - SHORE.z) > 3, bounds: [-8, 8, 1, 17], scale: [0.5, 1.2], avoid: [[0, 0, 3]], avoidRadius: 3 }), []);
  const planks = useMemo(() => {
    const list: number[] = [];
    for (let z = PIER.zStart; z > PIER.zEnd; z -= 0.55) list.push(z);
    return list;
  }, []);
  return (
    <group>
      <mesh position={[SHORE.x, -0.2, SHORE.z]}>
        <cylinderGeometry args={[SHORE.r, SHORE.r + 2, 1.6, 36]} />
        <meshStandardMaterial color="#c8b48a" roughness={1} />
      </mesh>
      <mesh position={[SHORE.x, 0.55, SHORE.z]}>
        <cylinderGeometry args={[SHORE.r * 0.55, SHORE.r, 0.5, 36]} />
        <meshStandardMaterial color="#5f8a62" roughness={1} />
      </mesh>
      <Rocks placements={rocks} getHeight={getHeight} color="#5a5a74" />
      {/* pier */}
      {planks.map((z, i) => (
        <mesh key={i} position={[PIER.x, PIER.y - 0.06, z - 0.25]} receiveShadow castShadow>
          <boxGeometry args={[OCEAN.pierWidth, 0.12, 0.48]} />
          <meshStandardMaterial color={i % 2 ? "#6a4a32" : "#5c3f2a"} roughness={0.9} />
        </mesh>
      ))}
      {[PIER.zStart - 1, -2, -5, PIER.zEnd].flatMap((z) =>
        [-1, 1].map((side) => (
          <mesh key={`${z}-${side}`} position={[side * (PIER.hw + 0.1), 0.2, z]} castShadow>
            <cylinderGeometry args={[0.12, 0.14, 1.9, 7]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </mesh>
        )),
      )}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (PIER.hw + 0.1), PIER.y, PIER.zEnd + 0.4]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 2.2, 6]} />
            <meshStandardMaterial color="#3a2a1a" />
          </mesh>
          <mesh position={[0, 2.3, 0]}>
            <boxGeometry args={[0.28, 0.34, 0.28]} />
            <meshStandardMaterial color="#ffd27a" emissive="#ffd27a" emissiveIntensity={1.6} transparent opacity={0.9} />
          </mesh>
          <pointLight position={[0, 2.3, 0]} color="#ffd27a" intensity={4} distance={8} decay={2} />
        </group>
      ))}
    </group>
  );
}

function StarShrine({ active, onInteract }: { active: boolean; onInteract: () => void }) {
  const beam = useRef<THREE.Group>(null);
  const star = useRef<THREE.Mesh>(null);
  const puzzleSolved = useProgressStore((s) => s.puzzleState === "solved");
  const p = OCEAN.shrine;
  const pos = useMemo(() => new THREE.Vector3(p[0], 4, p[2]), [p]);
  useInteractable(
    active
      ? {
          id: "star-shrine",
          position: pos,
          radius: SHRINE_ROCK_R + 6,
          label: puzzleSolved ? "Mercusuar Bintang" : "Hubungkan bintang",
          icon: "star",
          priority: 9,
          enabled: !puzzleSolved,
          onInteract,
        }
      : null,
  );
  useFrame(({ clock }) => {
    if (beam.current) beam.current.rotation.y = clock.elapsedTime * 0.5;
    if (star.current) {
      star.current.rotation.y = clock.elapsedTime * 0.8;
      star.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.08);
    }
  });
  return (
    <group position={[p[0], 0, p[2]]}>
      <mesh position={[0, -0.5, 0]}>
        <dodecahedronGeometry args={[SHRINE_ROCK_R, 1]} scale={[1, 0.35, 1]} />
        <meshStandardMaterial color="#3a3350" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[2.2, 3, 2.4, 10]} />
        <meshStandardMaterial color="#4a4266" roughness={0.9} />
      </mesh>
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.8, 10, 12]} />
        <meshStandardMaterial color="#d9d2f0" roughness={0.7} />
      </mesh>
      {[3.2, 6.2, 9.2].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[1.5 - y * 0.05, 0.12, 8, 24]} />
          <meshStandardMaterial color="#6b5fa0" />
        </mesh>
      ))}
      <mesh position={[0, 12.6, 0]}>
        <cylinderGeometry args={[1.5, 1.2, 1.2, 12]} />
        <meshStandardMaterial color="#6b5fa0" roughness={0.8} />
      </mesh>
      <mesh ref={star} position={[0, 14.2, 0]}>
        <octahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#fff1c9" emissive="#fff1c9" emissiveIntensity={puzzleSolved ? 3 : 1.4} roughness={0.2} />
      </mesh>
      <pointLight position={[0, 14.2, 0]} color="#fff1c9" intensity={puzzleSolved ? 40 : 14} distance={80} decay={2} />
      <group ref={beam} position={[0, 13.2, 0]}>
        <mesh position={[0, 0, 14]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[4.5, 28, 16, 1, true]} />
          <meshBasicMaterial color="#fff1c9" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <LightBeam position={[0, 0, 0]} color="#fff1c9" height={40} radius={1.6} opacity={puzzleSolved ? 0.6 : 0.25} />
      <Particles count={80} texture="star" color="#fff1c9" size={[0.08, 0.26]} area={[20, 18, 20]} center={[0, 12, 0]} velocity={[0, 0.3, 0]} jitter={0.3} sway={0.5} twinkle={2} seed={71} />
    </group>
  );
}

function DistantIslands() {
  const islands = useMemo(
    () => [
      { x: -120, z: -140, r: 26, h: 14 },
      { x: 110, z: -190, r: 34, h: 22 },
      { x: 150, z: -60, r: 20, h: 10 },
      { x: -170, z: -40, r: 24, h: 12 },
      { x: 20, z: -300, r: 60, h: 30 },
      { x: -70, z: -260, r: 30, h: 18 },
    ],
    [],
  );
  return (
    <group>
      {islands.map((i, idx) => (
        <mesh key={idx} position={[i.x, -1, i.z]}>
          <coneGeometry args={[i.r, i.h, 9]} />
          <meshStandardMaterial color="#0d0b22" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

export default function OceanWorld() {
  const sceneId = useProgressStore((s) => s.sceneId);
  const phase = useUIStore((s) => s.phase);
  const transitionActive = useUIStore((s) => s.transition.active);
  const puzzleState = useProgressStore((s) => s.puzzleState);
  const { preset } = useQuality();
  const sailed = useRef(false);
  const solvedHandled = useRef(false);
  const fog = useRef<THREE.Fog>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moonLight = useRef<THREE.DirectionalLight>(null);

  useEffect(() => {
    setWorld({
      id: "ocean",
      getHeight,
      isWalkable,
      colliders: [circle(SHORE.x, SHORE.z + 2, 0.8)],
      mode: "walk",
      respawn: OCEAN.pierStart,
    });
    fx.oceanSunrise = useProgressStore.getState().completedScenes.includes("beyond-horizon") ? 1 : 0;
    game.notifyEnvironmentReady("ocean");
    return () => {
      game.notifyEnvironmentUnmounted("ocean");
      audio.stopLoop("boat-loop", 500);
      setWorld(null);
    };
  }, []);

  // Make sure the player is aboard for the sailing scenes (resume / restart).
  useEffect(() => {
    if (transitionActive || phase !== "playing") return;
    const p = runtime.player;
    if (!BOAT_SCENES.includes(sceneId)) {
      // Back on foot (chapter restart / resume at the pier).
      if (p.mode === "boat") {
        p.mode = "walk";
        runtime.camera.mode = "follow";
        audio.stopLoop("boat-loop", 400);
        p.position.set(OCEAN.pierStart[0], 0, OCEAN.pierStart[2]);
        runtime.camera.snapBehind(p.position, Math.PI);
      }
      return;
    }
    if (p.mode === "boat") return;
    const start = boatStartFor(sceneId);
    p.mode = "boat";
    p.position.set(start[0], 0.5, start[2]);
    p.boat.heading = Math.PI;
    p.boat.speed = 0;
    p.visible = true;
    runtime.camera.mode = "boat";
    runtime.camera.snapBehind(p.position, Math.PI);
    audio.startLoop("boat-loop", 0.15, 1200);
  }, [sceneId, transitionActive, phase]);

  // Scene 12 — sail to the light
  useFrame(() => {
    if (sceneId !== "sail-with-me" || sailed.current || phase !== "playing" || runtime.player.mode !== "boat") return;
    const p = runtime.player.position;
    if (Math.hypot(p.x - OCEAN.marker[0], p.z - OCEAN.marker[2]) < 7) {
      sailed.current = true;
      audio.sfx("sparkle");
      game.advanceObjective("sail-to-light");
    }
  });

  // Scene 14 — puzzle solved → scene complete once the overlay closes (guarded against re-entry)
  const overlay = useUIStore((s) => s.overlay);
  useEffect(() => {
    if (sceneId !== "star-puzzle" || puzzleState !== "solved" || solvedHandled.current || overlay) return;
    solvedHandled.current = true;
    game.advanceObjective("solve-stars", { delay: 400 });
  }, [overlay, sceneId, puzzleState]);

  // Sunrise drives sky, fog and lights.
  useFrame(() => {
    const s = fx.oceanSunrise;
    if (fog.current) {
      fog.current.color.copy(FOG_NIGHT).lerp(FOG_SUNRISE, s);
      fog.current.near = lerp(40, 70, s);
      fog.current.far = lerp(210, 320, s);
    }
    if (ambient.current) ambient.current.intensity = lerp(0.35, 0.8, s);
    if (sun.current) sun.current.intensity = s * 1.6;
    if (moonLight.current) moonLight.current.intensity = lerp(0.9, 0.2, s);
  });

  const onSky = (u: Record<string, THREE.IUniform>) => {
    const s = fx.oceanSunrise;
    (u.uTop.value as THREE.Color).copy(NIGHT_C.top).lerp(SUNRISE.top, s);
    (u.uHorizon.value as THREE.Color).copy(NIGHT_C.horizon).lerp(SUNRISE.horizon, s);
    (u.uBottom.value as THREE.Color).copy(NIGHT_C.bottom).lerp(SUNRISE.bottom, s);
    u.uSun.value = s;
    u.uStars.value = 1.2 - s;
    u.uMoon.value = 1 - s * 0.8;
    u.uNebula.value = 0.6 - s * 0.4;
    (u.uSunDir.value as THREE.Vector3).set(0.2, 0.02 + s * 0.12, -1).normalize();
  };

  const showBottles = sceneId === "message-bottles" || sceneId === "star-puzzle";
  const openPuzzle = () => {
    if (useProgressStore.getState().puzzleState === "solved") return;
    audio.sfx("ui-open");
    useUIStore.getState().openOverlay({ type: "puzzle" });
  };

  return (
    <group>
      <SkyDome palette={NIGHT} onFrame={onSky} />
      <fog ref={fog} attach="fog" args={["#0a0a24", 40, 210]} />
      <ambientLight ref={ambient} color="#8fa0ff" intensity={0.35} />
      <hemisphereLight color="#4a5aa0" groundColor="#050516" intensity={0.5} />
      <directionalLight ref={moonLight} position={[OCEAN.moonDirection[0] * 60, OCEAN.moonDirection[1] * 60, OCEAN.moonDirection[2] * 60]} color="#cfd8ff" intensity={0.9} castShadow={preset.shadows} shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-camera-far={120} shadow-bias={-0.0004} />
      <directionalLight ref={sun} position={[20, 10, -100]} color="#ffb08a" intensity={0} />

      <Water size={700} position={[0, 0, -90]} getSunrise={() => fx.oceanSunrise} getFogColor={(c) => c.copy(FOG_NIGHT).lerp(FOG_SUNRISE, fx.oceanSunrise)} fogNear={60} fogFar={300} moonDir={OCEAN.moonDirection} />
      {/* moon reflection glow on the horizon */}
      <mesh position={[OCEAN.moonDirection[0] * 380, 160, OCEAN.moonDirection[2] * 380]}>
        <sphereGeometry args={[14, 24, 18]} />
        <meshBasicMaterial color="#f4f1ff" toneMapped={false} />
      </mesh>

      <Shore />
      <Boat />
      <StarShrine active={sceneId === "star-puzzle"} onInteract={openPuzzle} />
      <DistantIslands />

      <GlowMarker position={[OCEAN.marker[0], 0.3, OCEAN.marker[2]]} active={sceneId === "sail-with-me"} color="#8fd3ff" radius={3} />
      <GlowMarker position={[OCEAN.boatMoor[0], 0.2, OCEAN.boatMoor[2]]} active={sceneId === "silent-ocean"} color="#ffd27a" radius={1.8} beam={false} />

      {showBottles &&
        OCEAN.bottles.map((pos, i) => {
          const bottle = story.bottles[i];
          return (
            <Collectible
              key={bottle.id}
              id={bottle.id}
              position={[pos[0], 0.25, pos[2]]}
              hover={0}
              radius={6}
              label="Ambil botol"
              icon="bottle"
              shape="bottle"
              color="#8fd3ff"
              scale={1.6}
              onCollect={() => {
                void (async () => {
                  await game.openBottle(bottle.id);
                  game.collect(bottle.id, { sfx: "collect" });
                  if (useProgressStore.getState().sceneId === "message-bottles") game.advanceObjective("collect-bottles");
                })();
                return true;
              }}
            />
          );
        })}
      {/* guide lights toward the bottles & shrine */}
      {showBottles && OCEAN.bottles.map((pos, i) => <LightBeam key={i} position={[pos[0], 0, pos[2]]} color="#8fd3ff" height={22} radius={0.9} opacity={0.35} />)}

      <Particles count={160} texture="glow" color={["#8fd3ff", "#ffffff"]} size={[0.05, 0.16]} area={[220, 4, 260]} center={[0, 1, -90]} velocity={[0.1, 0.05, 0]} jitter={0.3} sway={0.4} twinkle={2} seed={81} />
      <Particles count={60} texture="cloud" color="#2a2a5a" size={[14, 30]} area={[400, 20, 400]} center={[0, 24, -120]} velocity={[0.5, 0, 0]} jitter={0.02} sway={0.1} twinkle={0.05} opacity={0.25} spin={0.02} seed={82} renderOrder={-1} />
    </group>
  );
}
