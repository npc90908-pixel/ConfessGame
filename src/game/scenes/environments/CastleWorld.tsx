"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { story } from "@/config/story";
import { fx } from "@/game/engine/fx";
import { game } from "@/game/engine/GameManager";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { box, circle, setWorld, type Collider } from "@/game/engine/world";
import { Collectible, HeartMesh } from "@/game/objects/Collectible";
import { GrassTufts, Lantern, Rocks, Trees, scatter } from "@/game/objects/Flora";
import { GlowMarker } from "@/game/objects/GlowMarker";
import { Particles } from "@/game/objects/Particles";
import { SkyDome, type SkyPalette } from "@/game/objects/SkyDome";
import { Ground, StoneDisc, makeRollingHeight } from "@/game/objects/Terrain";
import { audio } from "@/game/systems/audio/AudioManager";
import { useQuality } from "@/game/systems/quality";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { CASTLE } from "../landmarks";

const H = CASTLE.halfSize;
const FZ = CASTLE.facadeZ; // -20
const CH = CASTLE.chamberHalf; // 11 x 8 around (0,-30)
const HR = CASTLE.heartRoomRadius; // 10 around (0,-50)
const GATE_HW = 2.2;
const DOOR_HW = 1.6;

const flatSpots: Array<[number, number, number]> = [
  [0, 26, 4],
  [0, FZ + 2, 6],
  [CASTLE.fountain[0], CASTLE.fountain[2], 5],
];
const courtyardHeight = makeRollingHeight(44, 0.3, 0.1, flatSpots);
const getHeight = (x: number, z: number) => (z < FZ + 0.5 ? 0.15 : courtyardHeight(x, z));

const inCourtyard = (x: number, z: number) => Math.abs(x) < H - 1 && z > FZ + 0.8 && z < H + 4;
const inGateway = (x: number, z: number) => Math.abs(x) < GATE_HW - 0.3 && z <= FZ + 0.8 && z >= FZ - 2.2;
const inChamber = (x: number, z: number) => Math.abs(x - CASTLE.chamberCenter[0]) < CH.w - 0.8 && Math.abs(z - CASTLE.chamberCenter[2]) < CH.d - 0.8;
const inDoorway = (x: number, z: number) => Math.abs(x) < DOOR_HW - 0.3 && z <= CASTLE.chamberCenter[2] - CH.d + 0.8 && z >= CASTLE.heartRoom[2] + HR - 1.2;
const inHeartRoom = (x: number, z: number) => Math.hypot(x - CASTLE.heartRoom[0], z - CASTLE.heartRoom[2]) < HR - 0.8;

const isWalkable = (x: number, z: number) => {
  if (inCourtyard(x, z)) return true;
  if (inGateway(x, z)) return fx.castleGate > 0.6;
  if (inChamber(x, z)) return fx.castleGate > 0.6;
  if (inDoorway(x, z)) return fx.castleInnerDoor > 0.6;
  if (inHeartRoom(x, z)) return fx.castleInnerDoor > 0.6;
  return false;
};

const avoid: Array<[number, number, number]> = [CASTLE.spawn, CASTLE.gate, CASTLE.fountain, ...CASTLE.keys, [0, 0, 0]];
const inGrounds = (x: number, z: number) => inCourtyard(x, z) && Math.abs(x) > 3.5 && z > FZ + 4;

const SKY: SkyPalette = {
  top: "#07051a",
  horizon: "#2b1d4e",
  bottom: "#05040f",
  nebulaA: "#3a2a7a",
  nebulaB: "#8a3a7a",
  nebula: 0.8,
  stars: 1,
  sun: 0,
  moon: 0.9,
  moonDir: [0.4, 0.5, -0.75],
};

const KEY_COLORS: Record<string, string> = Object.fromEntries(story.keys.map((k) => [k.id, k.color]));

/* -------------------------------------------------------------------------- */
/*  Castle architecture                                                       */
/* -------------------------------------------------------------------------- */

function Tower({ position, radius = 3, height = 16, windows = 3 }: { position: [number, number, number]; radius?: number; height?: number; windows?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 1.12, height, 14]} />
        <meshStandardMaterial color="#4a4466" roughness={0.95} />
      </mesh>
      <mesh position={[0, height + 1.8, 0]} castShadow>
        <coneGeometry args={[radius * 1.25, 4, 14]} />
        <meshStandardMaterial color="#2c2446" roughness={0.9} />
      </mesh>
      {Array.from({ length: windows }).map((_, i) => (
        <mesh key={i} position={[Math.sin(i * 1.3 + 0.6) * radius, 4 + i * (height - 6) / Math.max(1, windows - 1), Math.cos(i * 1.3 + 0.6) * radius]} rotation={[0, i * 1.3 + 0.6, 0]}>
          <planeGeometry args={[0.7, 1.4]} />
          <meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={2.4} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <pointLight position={[0, height * 0.6, radius + 1]} color="#ffb347" intensity={3} distance={12} decay={2} />
    </group>
  );
}

function Wall({ from, to, height = 7, thickness = 1.6 }: { from: [number, number]; to: [number, number]; height?: number; thickness?: number }) {
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const angle = Math.atan2(to[0] - from[0], to[1] - from[1]);
  return (
    <group position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]} rotation={[0, angle, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, height, len]} />
        <meshStandardMaterial color="#45405f" roughness={0.95} />
      </mesh>
      {Array.from({ length: Math.floor(len / 2.2) }).map((_, i) => (
        <mesh key={i} position={[0, height + 0.45, -len / 2 + 1.1 + i * 2.2]}>
          <boxGeometry args={[thickness, 0.9, 1.1]} />
          <meshStandardMaterial color="#3a3552" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function Gate({ open }: { open: () => number }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const k = useRef(0);
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.damp(k.current, open(), 1.5, dt);
    const a = k.current * 1.9;
    if (left.current) left.current.rotation.y = a;
    if (right.current) right.current.rotation.y = -a;
    if (glow.current) glow.current.emissiveIntensity = 0.6 + k.current * 2.4;
  });
  return (
    <group position={[0, 0, FZ]}>
      {/* arch */}
      <mesh position={[0, 6.6, 0]} castShadow>
        <boxGeometry args={[GATE_HW * 2 + 2.4, 1.6, 2.2]} />
        <meshStandardMaterial color="#5a5478" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (GATE_HW + 0.7), 3, 0]} castShadow>
          <boxGeometry args={[1.4, 6, 2.2]} />
          <meshStandardMaterial color="#5a5478" roughness={0.9} />
        </mesh>
      ))}
      {/* doors */}
      <group ref={left} position={[-GATE_HW, 0, 0.9]}>
        <mesh position={[GATE_HW / 2, 2.9, 0]} castShadow>
          <boxGeometry args={[GATE_HW, 5.8, 0.3]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>
      </group>
      <group ref={right} position={[GATE_HW, 0, 0.9]}>
        <mesh position={[-GATE_HW / 2, 2.9, 0]} castShadow>
          <boxGeometry args={[GATE_HW, 5.8, 0.3]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
        </mesh>
      </group>
      {/* keyhole crest */}
      <mesh position={[0, 7.6, 1.2]}>
        <circleGeometry args={[0.55, 24]} />
        <meshStandardMaterial ref={glow} color="#ffd27a" emissive="#ffd27a" emissiveIntensity={0.6} />
      </mesh>
      <pointLight position={[0, 5, 2.5]} color="#ffd27a" intensity={6} distance={14} decay={2} />
    </group>
  );
}

function InnerDoor({ open }: { open: () => number }) {
  const door = useRef<THREE.Mesh>(null);
  const k = useRef(0);
  const z = CASTLE.chamberCenter[2] - CH.d;
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.damp(k.current, open(), 1.5, dt);
    if (door.current) door.current.position.y = 2.4 - k.current * 4.6;
  });
  return (
    <group position={[0, 0, z]}>
      <mesh ref={door} position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[DOOR_HW * 2, 4.8, 0.4]} />
        <meshStandardMaterial color="#6b5fa0" emissive="#b9a7ff" emissiveIntensity={0.4} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 5.2, 0]}>
        <boxGeometry args={[DOOR_HW * 2 + 1.6, 1, 1]} />
        <meshStandardMaterial color="#5a5478" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (DOOR_HW + 0.5), 2.4, 0]}>
          <boxGeometry args={[1, 4.8, 1]} />
          <meshStandardMaterial color="#5a5478" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Pedestal({ index, active }: { index: number; active: boolean }) {
  const fragment = story.fragments[index];
  const key = story.keys.find((k) => k.id === fragment.keyId);
  const color = key?.color ?? "#f3d08a";
  const hasKey = useProgressStore((s) => s.inventory.includes(fragment.keyId));
  const unlocked = useProgressStore((s) => s.unlockedFragments.includes(fragment.id));
  const p = CASTLE.pedestals[index];
  const pos = useMemo(() => new THREE.Vector3(p[0], 1.4, p[2]), [p]);
  const orb = useRef<THREE.Mesh>(null);
  const busy = useRef(false);

  useInteractable(
    active && !unlocked
      ? {
          id: `pedestal-${index}`,
          position: pos,
          radius: 2.6,
          label: hasKey ? `Gunakan ${key?.name.split(" — ")[0] ?? "kunci"}` : "Butuh kunci",
          icon: "key",
          enabled: hasKey,
          priority: 6,
          onInteract: () => {
            if (busy.current) return;
            busy.current = true;
            void (async () => {
              await game.openFragment(fragment.id);
              game.collect(fragment.id, { sfx: "sparkle", toast: false });
              game.advanceObjective("unlock-fragments");
              busy.current = false;
            })();
          },
        }
      : null,
  );

  useFrame(({ clock }) => {
    if (orb.current) {
      orb.current.rotation.y = clock.elapsedTime * 0.7;
      orb.current.position.y = 1.55 + Math.sin(clock.elapsedTime * 1.4 + index) * 0.08;
    }
  });

  return (
    <group position={[p[0], 0.15, p[2]]} onClick={(e) => (e.stopPropagation(), triggerInteraction(`pedestal-${index}`))}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.6, 1.1, 10]} />
        <meshStandardMaterial color="#6b6484" roughness={0.9} />
      </mesh>
      <mesh ref={orb} position={[0, 1.55, 0]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={unlocked ? 2.5 : 0.5} roughness={0.2} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} color={color} intensity={unlocked ? 6 : 1.5} distance={6} decay={2} />
      {unlocked && <Particles count={16} texture="spark" color={color} size={[0.04, 0.12]} area={[1, 1.4, 1]} center={[0, 1.6, 0]} velocity={[0, 0.3, 0]} twinkle={1.5} seed={90 + index} />}
    </group>
  );
}

function CrystalHeart({ active, onInteract }: { active: boolean; onInteract: () => void }) {
  const heart = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const h = CASTLE.heart;
  const pos = useMemo(() => new THREE.Vector3(h[0], h[1], h[2]), [h]);
  const lastBeat = useRef(0);
  useInteractable(
    active
      ? {
          id: "crystal-heart",
          position: pos,
          radius: 4,
          label: "Sentuh hati kristal",
          icon: "heart",
          priority: 9,
          onInteract,
        }
      : null,
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Double-thump heartbeat
    const phase = (t * 1.1) % 1;
    const beat = Math.exp(-phase * 9) + 0.6 * Math.exp(-Math.max(0, phase - 0.22) * 12) * (phase > 0.22 ? 1 : 0);
    const s = 1 + beat * 0.08 * fx.heartGlow;
    if (heart.current) {
      heart.current.scale.setScalar(s);
      heart.current.rotation.y = t * 0.35;
      heart.current.position.y = h[1] + Math.sin(t * 0.9) * 0.1;
    }
    if (light.current) light.current.intensity = (8 + beat * 22) * fx.heartGlow;
    if (phase < lastBeat.current && active) {
      const p = runtime.player.position;
      const d = Math.hypot(p.x - h[0], p.z - h[2]);
      if (d < 12) audio.sfx("heartbeat", { volume: Math.max(0.05, 0.6 - d * 0.04) });
    }
    lastBeat.current = phase;
  });
  return (
    <group position={[h[0], 0, h[2]]}>
      <StoneDisc position={[0, 0.15, 0]} radius={2.2} color="#5e5680" height={0.4} />
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.5, 0.8, 1.2, 8]} />
        <meshStandardMaterial color="#7b73a0" roughness={0.6} />
      </mesh>
      <group ref={heart} position={[0, h[1], 0]} onClick={(e) => (e.stopPropagation(), triggerInteraction("crystal-heart"))}>
        <HeartMesh color="#ff4f8a" scale={0.95} emissiveIntensity={1.6} />
        <mesh>
          <sphereGeometry args={[1.6, 20, 16]} />
          <meshBasicMaterial color="#ff8fb8" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, h[1], 0]} color="#ff6fa3" intensity={10} distance={26} decay={2} />
      <Particles count={120} texture="heart" color={["#ff8fb8", "#ffd6e7"]} size={[0.08, 0.22]} area={[8, 8, 8]} center={[0, 3, 0]} velocity={[0, 0.4, 0]} jitter={0.4} sway={0.5} spin={0.5} twinkle={1.2} seed={95} />
      <Particles count={90} texture="spark" color="#fff1c9" size={[0.04, 0.12]} area={[12, 7, 12]} center={[0, 3, 0]} velocity={[0, 0.2, 0]} jitter={0.3} sway={0.3} twinkle={2} seed={96} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

export default function CastleWorld() {
  const sceneId = useProgressStore((s) => s.sceneId);
  const phase = useUIStore((s) => s.phase);
  const { preset } = useQuality();
  const reachedGate = useRef(false);
  const reachedHeart = useRef(false);
  const heartBusy = useRef(false);

  useEffect(() => {
    const colliders: Collider[] = [
      // towers
      circle(-H + 2, FZ, 3.2),
      circle(H - 2, FZ, 3.2),
      circle(-H + 2, H - 2, 2.6),
      circle(H - 2, H - 2, 2.6),
      // fountain
      circle(CASTLE.fountain[0], CASTLE.fountain[2], 2.3),
      // gate pillars
      circle(-(GATE_HW + 0.7), FZ, 1),
      circle(GATE_HW + 0.7, FZ, 1),
      // pedestals
      ...CASTLE.pedestals.map((p) => circle(p[0], p[2], 0.7)),
      circle(CASTLE.heart[0], CASTLE.heart[2], 1.6),
      // outer hedges
      box(0, H + 1, H + 2, 0.5),
      box(-H - 1, 0, 0.5, H + 2),
      box(H + 1, 0, 0.5, H + 2),
    ];
    setWorld({ id: "castle", getHeight, isWalkable, colliders, mode: "walk", respawn: CASTLE.spawn });
    const completed = useProgressStore.getState().completedScenes;
    fx.castleGate = completed.includes("three-keys") ? 1 : 0;
    fx.castleInnerDoor = completed.includes("unspoken-words") ? 1 : 0;
    game.notifyEnvironmentReady("castle");
    return () => {
      game.notifyEnvironmentUnmounted("castle");
      setWorld(null);
    };
  }, []);

  // Scene 16 — reach the gate
  useFrame(() => {
    if (phase !== "playing") return;
    const p = runtime.player.position;
    if (sceneId === "forgotten-castle" && !reachedGate.current && Math.hypot(p.x - CASTLE.gate[0], p.z - CASTLE.gate[2]) < 2.4) {
      reachedGate.current = true;
      audio.sfx("sparkle");
      game.advanceObjective("reach-gate");
    }
    if (sceneId === "heart-chamber" && !reachedHeart.current && Math.hypot(p.x - CASTLE.heartRoom[0], p.z - CASTLE.heartRoom[2]) < HR - 3) {
      reachedHeart.current = true;
      audio.sfx("sparkle");
      game.advanceObjective("reach-heart", { delay: 600 });
    }
  });

  // Gate opening sound cues when the flags flip.
  const prevGate = useRef(0);
  const prevDoor = useRef(0);
  useFrame(() => {
    if (fx.castleGate > 0.5 && prevGate.current <= 0.5) audio.sfx("door-unlock", { volume: 0.9 });
    if (fx.castleInnerDoor > 0.5 && prevDoor.current <= 0.5) audio.sfx("door-unlock", { volume: 0.9, rate: 0.85 });
    prevGate.current = fx.castleGate;
    prevDoor.current = fx.castleInnerDoor;
  });

  const touchHeart = () => {
    if (heartBusy.current || reachedHeart.current) return;
    heartBusy.current = true;
    reachedHeart.current = true;
    audio.sfx("sparkle");
    game.advanceObjective("reach-heart", { delay: 300 });
  };

  const scatterData = useMemo(() => {
    const trees = scatter({ count: 16, seed: 401, area: inGrounds, bounds: [-H, H, FZ, H], scale: [0.8, 1.2], avoid, avoidRadius: 4 });
    const rocks = scatter({ count: 14, seed: 402, area: inGrounds, bounds: [-H, H, FZ, H], scale: [0.4, 0.9], avoid, avoidRadius: 2.5 });
    const grass = scatter({ count: 500, seed: 403, area: (x, z) => inCourtyard(x, z) && Math.abs(x) > 2.8, bounds: [-H, H, FZ, H], scale: [0.6, 1.2], avoid: [CASTLE.fountain], avoidRadius: 3 });
    return { trees, rocks, grass };
  }, []);

  const showKeys = sceneId === "three-keys";
  const showPedestals = sceneId === "unspoken-words" || sceneId === "heart-chamber";

  return (
    <group>
      <SkyDome palette={SKY} />
      <fog attach="fog" args={["#140f2e", 24, 95]} />
      <ambientLight color="#8d8ad6" intensity={0.4} />
      <hemisphereLight color="#6a5fb0" groundColor="#0e0a1e" intensity={0.5} />
      <directionalLight
        position={[18, 26, -16]}
        color="#b9c4ff"
        intensity={0.8}
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-bias={-0.0005}
      />

      <Ground size={H * 2 + 40} getHeight={getHeight} color="#2f4a3e" />
      {/* castle floor */}
      <mesh position={[0, 0.1, -40]} receiveShadow>
        <boxGeometry args={[40, 0.2, 48]} />
        <meshStandardMaterial color="#3b3652" roughness={0.9} />
      </mesh>
      <StoneDisc position={[0, 0.16, CASTLE.heartRoom[2]]} radius={HR} color="#4a4466" height={0.1} />
      {/* path */}
      <mesh position={[0, getHeight(0, 4) + 0.03, 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.4, 44]} />
        <meshStandardMaterial color="#5e5680" roughness={0.95} />
      </mesh>

      {/* facade walls and towers */}
      <Wall from={[-H + 2, FZ]} to={[-GATE_HW - 1.4, FZ]} />
      <Wall from={[GATE_HW + 1.4, FZ]} to={[H - 2, FZ]} />
      <Tower position={[-H + 2, 0, FZ]} radius={3.2} height={18} />
      <Tower position={[H - 2, 0, FZ]} radius={3.2} height={18} />
      <Tower position={[-H + 2, 0, H - 2]} radius={2.4} height={10} windows={2} />
      <Tower position={[H - 2, 0, H - 2]} radius={2.4} height={10} windows={2} />
      <Wall from={[-H + 2, FZ]} to={[-H + 2, H - 2]} height={5} thickness={1.2} />
      <Wall from={[H - 2, FZ]} to={[H - 2, H - 2]} height={5} thickness={1.2} />
      {/* keep behind the facade */}
      <mesh position={[0, 7, -34]} castShadow receiveShadow>
        <boxGeometry args={[CH.w * 2 + 6, 14, CH.d * 2 + 10]} />
        <meshStandardMaterial color="#4a4466" roughness={0.95} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 14.4, -34]} castShadow>
        <boxGeometry args={[CH.w * 2 + 6, 0.8, CH.d * 2 + 10]} />
        <meshStandardMaterial color="#3a3552" roughness={0.95} />
      </mesh>
      <mesh position={[0, 7, FZ - 0.6]}>
        <boxGeometry args={[CH.w * 2 + 6, 14, 0.6]} />
        <meshStandardMaterial color="#4a4466" roughness={0.95} />
      </mesh>
      <Tower position={[0, 0, -34]} radius={4.5} height={26} windows={5} />
      {/* heart room dome */}
      <mesh position={[CASTLE.heartRoom[0], 0, CASTLE.heartRoom[2]]}>
        <sphereGeometry args={[HR + 1.2, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a3552" roughness={0.95} side={THREE.BackSide} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[CASTLE.heartRoom[0] + Math.cos(a) * (HR - 0.6), 3.2, CASTLE.heartRoom[2] + Math.sin(a) * (HR - 0.6)]} rotation={[0, -a + Math.PI / 2, 0]}>
            <planeGeometry args={[1.2, 3]} />
            <meshStandardMaterial color="#ff9fc4" emissive="#ff6fa3" emissiveIntensity={1.2} side={THREE.DoubleSide} />
          </mesh>
        );
      })}

      <Gate open={() => fx.castleGate} />
      <InnerDoor open={() => fx.castleInnerDoor} />

      {/* fountain */}
      <group position={[CASTLE.fountain[0], getHeight(CASTLE.fountain[0], CASTLE.fountain[2]), CASTLE.fountain[2]]}>
        <mesh position={[0, 0.3, 0]} receiveShadow>
          <cylinderGeometry args={[2.2, 2.4, 0.6, 20]} />
          <meshStandardMaterial color="#6b6484" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[1.9, 1.9, 0.08, 20]} />
          <meshStandardMaterial color="#5a8ad0" emissive="#3a6ab0" emissiveIntensity={0.3} roughness={0.1} metalness={0.3} />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.25, 0.4, 1.4, 10]} />
          <meshStandardMaterial color="#7b73a0" roughness={0.8} />
        </mesh>
        <Particles count={40} texture="glow" color="#bfe0ff" size={[0.05, 0.12]} area={[1.2, 1.5, 1.2]} center={[0, 1.6, 0]} velocity={[0, -0.6, 0]} gravity={0.5} jitter={0.3} twinkle={1} seed={97} />
      </group>

      <Trees placements={scatterData.trees} getHeight={getHeight} variant="pine" leafColors={["#2f5f6a", "#3a6a7a", "#2a4f5a"]} trunkColor="#3a2a3a" />
      <Rocks placements={scatterData.rocks} getHeight={getHeight} color="#4f4868" />
      <GrassTufts placements={scatterData.grass} getHeight={getHeight} color="#3f7a5a" />

      {[
        [-3.2, 18],
        [3.2, 18],
        [-3.2, 8],
        [3.2, 8],
        [-3.2, -4],
        [3.2, -4],
        [-3.2, -12],
        [3.2, -12],
      ].map(([x, z], i) => (
        <Lantern key={i} position={[x, getHeight(x, z), z]} color="#ffb347" light={preset.shadows && i % 4 === 1} />
      ))}
      {/* chamber torches */}
      {[
        [-CH.w + 1, -24],
        [CH.w - 1, -24],
        [-CH.w + 1, -36],
        [CH.w - 1, -36],
      ].map(([x, z], i) => (
        <Lantern key={i} position={[x, 0.15, z]} color="#ff9f6a" light height={2.6} />
      ))}

      <GlowMarker position={[CASTLE.gate[0], getHeight(CASTLE.gate[0], CASTLE.gate[2]), CASTLE.gate[2]]} active={sceneId === "forgotten-castle"} color="#f3d08a" />
      <GlowMarker position={[CASTLE.gate[0], 0.15, CASTLE.gate[2] - 4]} active={sceneId === "unspoken-words"} color="#f3d08a" beam={false} />
      <GlowMarker position={[CASTLE.heartRoom[0], 0.2, CASTLE.heartRoom[2] + 6]} active={sceneId === "heart-chamber"} color="#ff8fb8" />

      {showKeys &&
        story.keys.map((key, i) => (
          <Collectible
            key={key.id}
            id={key.id}
            position={[CASTLE.keys[i][0], getHeight(CASTLE.keys[i][0], CASTLE.keys[i][2]), CASTLE.keys[i][2]]}
            label={`Ambil ${key.name.split(" — ")[0]}`}
            icon="key"
            shape="key"
            color={KEY_COLORS[key.id]}
            onCollect={() => {
              if (!game.collect(key.id, { sfx: "key-pickup" })) return false;
              game.advanceObjective("collect-keys");
              return true;
            }}
          />
        ))}

      {showPedestals && story.fragments.map((_, i) => <Pedestal key={i} index={i} active={sceneId === "unspoken-words"} />)}
      <CrystalHeart active={sceneId === "heart-chamber"} onInteract={touchHeart} />

      {/* fog banks and embers */}
      <Particles count={90} texture="cloud" color="#4a4a7a" size={[8, 18]} area={[80, 6, 90]} center={[0, 1.5, -10]} velocity={[0.4, 0, 0.1]} jitter={0.02} sway={0.1} twinkle={0.05} opacity={0.22} spin={0.02} seed={98} renderOrder={-1} />
      <Particles count={120} texture="spark" color={["#ffb347", "#ff8a5a"]} size={[0.04, 0.12]} area={[50, 10, 60]} center={[0, 4, -10]} velocity={[0.05, 0.35, 0]} jitter={0.4} sway={0.6} twinkle={1.8} seed={99} />
    </group>
  );
}
