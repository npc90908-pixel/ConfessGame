"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { story } from "@/config/story";
import { MODELS } from "@/config/models";
import { fx } from "@/game/engine/fx";
import { game } from "@/game/engine/GameManager";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { box, circle, setWorld } from "@/game/engine/world";
import { hold, moveCamera, setCamera } from "@/game/animations/camera";
import { Collectible, HeartMesh } from "@/game/objects/Collectible";
import { Bushes, FlowerField, GrassTufts, Lantern, Rocks, Trees, scatter, type Placement } from "@/game/objects/Flora";
import { GlowMarker } from "@/game/objects/GlowMarker";
import { Keepsake, MemorySpot } from "@/game/objects/Keepsake";
import { Model, ModelInstances, placementsToInstances } from "@/game/objects/Model";
import { Particles } from "@/game/objects/Particles";
import { SkyDome, type SkyPalette } from "@/game/objects/SkyDome";
import { Bench, HedgeWalls, LanternHook, PlankBridge, lanternHookTip } from "@/game/objects/Structures";
import { Ground, StoneDisc, StonePath } from "@/game/objects/Terrain";
import { Stream } from "@/game/objects/Water";
import { audio } from "@/game/systems/audio/AudioManager";
import { useQuality } from "@/game/systems/quality";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { GARDEN } from "../landmarks";
import { createRng } from "@/lib/math";
import { BRIDGES, H, HILLS, NOOK_CENTER, NOOK_WALLS, PATHS, STREAM, colorAt, getHeight, groundHeight, inGarden, inGrove, inKnoll, inMeadow, inNook, inWater, isWalkable, nearHedge, streamCenterZ, streamDistance, streamSurfaceY } from "./garden/terrain";

const avoid: Array<[number, number, number]> = [GARDEN.spawn, GARDEN.pavilion, GARDEN.memoryTree, GARDEN.treeOffer, ...GARDEN.flowers, ...GARDEN.secrets, GARDEN.memorySpots.grove, GARDEN.memorySpots.knoll, NOOK_CENTER];
const surfaceY = (x: number) => streamSurfaceY(x);

/* --------------------------- landmark furniture ---------------------------- */

const STONE_CIRCLE_RADIUS = 3.6;
const STONE_CIRCLE_COUNT = 6;
const stoneCirclePositions = (center: [number, number, number]) =>
  Array.from({ length: STONE_CIRCLE_COUNT }, (_, i) => {
    const a = (i / STONE_CIRCLE_COUNT) * Math.PI * 2 + 0.4;
    return [center[0] + Math.cos(a) * STONE_CIRCLE_RADIUS, center[2] + Math.sin(a) * STONE_CIRCLE_RADIUS] as [number, number];
  });
const GATE_PILLARS: Array<[number, number]> = [
  [-2.8, GARDEN.spawn[2] + 3.5],
  [2.8, GARDEN.spawn[2] + 3.5],
];
const GROVE_HOOKS = [
  { x: GARDEN.memorySpots.grove[0] - 1.6, z: GARDEN.memorySpots.grove[2] - 1.2, rotationY: 0.4 },
  { x: GARDEN.memorySpots.grove[0] + 3.6, z: GARDEN.memorySpots.grove[2] + 2.8, rotationY: 2.6 },
].map((h) => ({ position: [h.x, getHeight(h.x, h.z), h.z] as [number, number, number], rotationY: h.rotationY }));
const LANDMARK_COLLIDERS = [
  ...GROVE_HOOKS.map((h) => circle(h.position[0], h.position[2], 0.2)),
  ...stoneCirclePositions(GARDEN.memorySpots.knoll).map(([x, z]) => circle(x, z, 0.45)),
  circle(GARDEN.memorySpots.knoll[0], GARDEN.memorySpots.knoll[2], 0.5),
  ...GATE_PILLARS.map(([x, z]) => circle(x, z, 0.4)),
  box(GARDEN.memorySpots.grove[0] + 1.5, GARDEN.memorySpots.grove[2] + 1, 0.9, 0.35, -0.6),
];

/** Standing stones on the knoll summit around a worn ring. */
function StoneCircle({ center }: { center: [number, number, number] }) {
  const stones = useMemo(() => stoneCirclePositions(center), [center]);
  const overrides = useMemo(() => ({ stone: { color: "#8a82a4" }, stoneDark: { color: "#6b6484" } }), []);
  return (
    <group>
      {stones.map(([x, z], i) => (
        <Model key={i} url={i % 2 === 0 ? MODELS.natStatueObelisk : MODELS.natStatueColumn} position={[x, getHeight(x, z) - 0.05, z]} rotation={[0, (i / STONE_CIRCLE_COUNT) * Math.PI * 2, 0]} scale={2.1} overrides={overrides} />
      ))}
      <Model url={MODELS.natStatueRing} position={[center[0], getHeight(center[0], center[2]), center[2]]} rotation={[0, Math.PI / 4, 0]} scale={2.4} overrides={overrides} />
      <pointLight position={[center[0], getHeight(center[0], center[2]) + 1.6, center[2]]} color="#b9a7ff" intensity={4} distance={9} decay={2} />
    </group>
  );
}

/** Two stone pillars and a beam marking the south gate where the player arrives. */
function GateArch() {
  const beamY = Math.max(...GATE_PILLARS.map(([x, z]) => getHeight(x, z))) + 3.1;
  return (
    <group>
      {GATE_PILLARS.map(([x, z], i) => (
        <Model key={i} url={MODELS.townPillarStone} position={[x, getHeight(x, z) - 0.05, z]} scale={3.2} overrides={{ stone: { color: "#8a82a4" } }} />
      ))}
      <mesh position={[0, beamY, GATE_PILLARS[0][1]]} castShadow>
        <boxGeometry args={[6.4, 0.3, 0.5]} />
        <meshStandardMaterial color="#5a4068" roughness={0.9} />
      </mesh>
      <Lantern style="hanging" position={[-1.6, beamY - 0.15, GATE_PILLARS[0][1]]} color="#ffd27a" scale={0.55} />
      <Lantern style="hanging" position={[1.6, beamY - 0.15, GATE_PILLARS[0][1]]} color="#ffd27a" scale={0.55} />
    </group>
  );
}

/** Lily pads floating on the stream surface. */
function Lilies({ placements }: { placements: Placement[] }) {
  const large = useMemo(() => placementsToInstances(placements.filter((_, i) => i % 2 === 0), { getHeight: (x) => surfaceY(x) + 0.02 }), [placements]);
  const small = useMemo(() => placementsToInstances(placements.filter((_, i) => i % 2 === 1), { getHeight: (x) => surfaceY(x) + 0.02 }), [placements]);
  return (
    <group>
      <ModelInstances url={MODELS.natLilyLarge} instances={large} scale={2.6} castShadow={false} />
      <ModelInstances url={MODELS.natLilySmall} instances={small} scale={2.6} castShadow={false} />
    </group>
  );
}

/** Mushroom clusters in the damp shade of the willow grove. */
function Mushrooms({ placements }: { placements: Placement[] }) {
  const red = useMemo(() => placementsToInstances(placements.filter((_, i) => i % 2 === 0), { getHeight }), [placements]);
  const tan = useMemo(() => placementsToInstances(placements.filter((_, i) => i % 2 === 1), { getHeight }), [placements]);
  return (
    <group>
      <ModelInstances url={MODELS.natMushroomRedGroup} instances={red} scale={2.4} castShadow={false} />
      <ModelInstances url={MODELS.natMushroomTanGroup} instances={tan} scale={2.4} castShadow={false} />
    </group>
  );
}

const DUSK_SKY: SkyPalette = {
  top: "#1b1040",
  horizon: "#6b3a7a",
  bottom: "#140b2a",
  nebulaA: "#7a4aa8",
  nebulaB: "#ff8fb8",
  nebula: 0.7,
  stars: 0.8,
  sun: 0.6,
  sunColor: "#ffb48a",
  sunDir: [0.6, 0.08, -0.8],
  sunSize: 0.05,
  moon: 0.4,
  moonDir: [-0.5, 0.5, 0.7],
};

const FLOWER_COLORS = ["#ff8fb8", "#b9a7ff", "#f3d08a", "#ffb7d5", "#7cc48f"];

/* -------------------------------------------------------------------------- */
/*  Pavilion                                                                  */
/* -------------------------------------------------------------------------- */

function Pavilion() {
  const y = getHeight(0, 0);
  return (
    <group position={[0, y, 0]}>
      {/* The plinth is part of the terrain now; this is only the paving + ring. */}
      <StoneDisc position={[0, -0.03, 0]} radius={3.4} color="#9b90b8" height={0.06} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.9, 1.7, Math.sin(a) * 2.9]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 3.4, 10]} />
            <meshStandardMaterial color="#f1e7ff" roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 3.55, 0]} castShadow>
        <coneGeometry args={[3.8, 1.4, 6]} />
        <meshStandardMaterial color="#5e3f7a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color="#ffd6e7" emissive="#ff8fb8" emissiveIntensity={1.4} />
      </mesh>
      {/* hanging lanterns between the pillars */}
      {Array.from({ length: 3 }).map((_, i) => {
        const a = ((i * 2 + 1) / 6) * Math.PI * 2;
        return <Lantern key={i} style="hanging" position={[Math.cos(a) * 2.9, 3.0, Math.sin(a) * 2.9]} color="#ffd6e7" scale={0.5} />;
      })}
      <pointLight position={[0, 2.9, 0]} color="#ffc6dc" intensity={8} distance={14} decay={2} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Floating polaroids                                                        */
/* -------------------------------------------------------------------------- */

story.memories.forEach((m) => useTexture.preload(m.image));

function Polaroid({ index, active }: { index: number; active: boolean }) {
  const memory = story.memories[index];
  const texture = useTexture(memory.image);
  const viewed = useProgressStore((s) => s.viewedMemories.includes(memory.id));
  const group = useRef<THREE.Group>(null);
  const angle = (index / story.memories.length) * Math.PI * 2 + 0.3;
  const base = useMemo(
    () => new THREE.Vector3(Math.cos(angle) * GARDEN.polaroidRadius, getHeight(0, 0) + GARDEN.polaroidHeight, Math.sin(angle) * GARDEN.polaroidRadius),
    [angle],
  );

  useInteractable(
    active
      ? {
          id: memory.id,
          position: base,
          radius: 2.4,
          label: viewed ? "Lihat lagi kenangan" : "Lihat kenangan",
          icon: "photo",
          onInteract: () => {
            void (async () => {
              const wasViewed = useProgressStore.getState().viewedMemories.includes(memory.id);
              await game.openMemory(memory.id);
              if (!wasViewed) {
                game.collect(memory.id, { sfx: "sparkle", toast: false });
                game.advanceObjective("view-memories");
              }
            })();
          },
        }
      : null,
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime + index * 1.3;
    g.position.set(base.x, base.y + Math.sin(t * 1.1) * 0.12, base.z);
    g.rotation.set(Math.sin(t * 0.7) * 0.06, -angle + Math.PI / 2 + Math.sin(t * 0.5) * 0.12, Math.cos(t * 0.9) * 0.05);
  });

  return (
    <group ref={group} onClick={(e) => (e.stopPropagation(), triggerInteraction(memory.id))}>
      <mesh castShadow>
        <boxGeometry args={[0.9, 1.08, 0.03]} />
        <meshStandardMaterial color="#fdfaf4" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, 0.02]}>
        <planeGeometry args={[0.78, 0.78]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {!viewed && (
        <>
          <pointLight color="#ffd6e7" intensity={1.2} distance={3} decay={2} />
          <Particles count={10} texture="spark" color="#ffd6e7" size={[0.04, 0.1]} area={[1.2, 1.4, 0.6]} center={[0, 0, 0]} velocity={[0, 0.2, 0]} twinkle={1.5} seed={40 + index} />
        </>
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Memory tree                                                               */
/* -------------------------------------------------------------------------- */

function MemoryTree() {
  const bloom = useRef(0);
  const canopy = useRef<THREE.Group>(null);
  const canopyMat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const blossoms = useRef<THREE.InstancedMesh>(null);
  const p = GARDEN.memoryTree;
  const y = getHeight(p[0], p[2]);

  const blossomMatrices = useMemo(() => {
    const list: THREE.Matrix4[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const rng = createRng(77);
    for (let i = 0; i < 140; i++) {
      const a = rng.range(0, Math.PI * 2);
      const r = 2 + rng.range(0, 3.8);
      const h = 5.5 + rng.range(0, 4.2) - (r / 5.8) * 1.5;
      m.compose(new THREE.Vector3(Math.cos(a) * r, h, Math.sin(a) * r), q, new THREE.Vector3(1, 1, 1));
      list.push(m.clone());
    }
    return list;
  }, []);

  useEffect(() => {
    const mesh = blossoms.current;
    if (!mesh) return;
    blossomMatrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [blossomMatrices]);

  const sleepColor = useMemo(() => new THREE.Color("#4a5a6a"), []);
  const bloomColor = useMemo(() => new THREE.Color("#ff9fc4"), []);

  useFrame(({ clock }, dt) => {
    bloom.current = THREE.MathUtils.damp(bloom.current, fx.gardenBloom, 1.2, dt);
    const b = bloom.current;
    if (canopyMat.current) {
      canopyMat.current.color.copy(sleepColor).lerp(bloomColor, b);
      canopyMat.current.emissive.copy(bloomColor);
      canopyMat.current.emissiveIntensity = b * 0.9;
    }
    if (canopy.current) {
      canopy.current.scale.setScalar(0.85 + b * 0.25);
      canopy.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.04;
    }
    if (blossoms.current) {
      blossoms.current.visible = b > 0.02;
      blossoms.current.scale.setScalar(Math.max(0.001, b));
    }
    if (light.current) light.current.intensity = 2 + b * 24 + Math.sin(clock.elapsedTime * 2) * b * 2;
  });

  return (
    <group position={[p[0], y, p[2]]}>
      {/* roots */}
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 1.5, 0.3, Math.sin(a) * 1.5]} rotation={[0.9, -a + Math.PI / 2, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.45, 2.4, 7]} />
            <meshStandardMaterial color="#4a3552" roughness={0.95} />
          </mesh>
        );
      })}
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.7, 1.2, 6, 10]} />
        <meshStandardMaterial color="#5a4068" roughness={0.9} />
      </mesh>
      <group ref={canopy} position={[0, 7.2, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[4.2, 1]} />
          <meshStandardMaterial ref={canopyMat} color="#4a5a6a" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[2.2, -0.6, 1.5]} castShadow>
          <icosahedronGeometry args={[2.4, 1]} />
          <meshStandardMaterial color="#5a6a7a" roughness={0.8} flatShading />
        </mesh>
        <mesh position={[-2.4, 0.4, -1.2]} castShadow>
          <icosahedronGeometry args={[2.6, 1]} />
          <meshStandardMaterial color="#5a6a7a" roughness={0.8} flatShading />
        </mesh>
      </group>
      <instancedMesh ref={blossoms} args={[undefined, undefined, blossomMatrices.length]} position={[0, 1.6, 0]}>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color="#ffd6e7" emissive="#ff8fb8" emissiveIntensity={1.4} roughness={0.5} />
      </instancedMesh>
      <HeartMesh color="#ff6fa3" scale={0.9} position={[0, 7.4, 3.6]} emissiveIntensity={2} />
      <pointLight ref={light} position={[0, 7, 0]} color="#ff9fc4" intensity={2} distance={30} decay={2} />
      <Particles count={120} texture="petal" color={["#ff9fc4", "#ffd6e7", "#ffffff"]} size={[0.12, 0.3]} area={[14, 10, 14]} center={[0, 6, 0]} velocity={[0.3, -0.5, 0.1]} jitter={0.4} sway={0.9} spin={1.2} twinkle={0.2} additive={false} seed={51} getOpacity={() => bloom.current} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

export default function MemoryGarden() {
  const sceneId = useProgressStore((s) => s.sceneId);
  const phase = useUIStore((s) => s.phase);
  const inventory = useProgressStore((s) => s.inventory);
  const { preset } = useQuality();
  const reached = useRef(false);
  const offering = useRef(false);
  const skyRef = useRef<Record<string, THREE.IUniform> | null>(null);
  const fog = useRef<THREE.Fog>(null);
  const ambient = useRef<THREE.AmbientLight>(null);

  useEffect(() => {
    setWorld({
      id: "memory-garden",
      getHeight,
      isWalkable,
      colliders: [
        ...Array.from({ length: 6 }).map((_, i) => circle(Math.cos((i / 6) * Math.PI * 2) * 2.9, Math.sin((i / 6) * Math.PI * 2) * 2.9, 0.35)),
        circle(GARDEN.memoryTree[0], GARDEN.memoryTree[2], 1.9),
        box(0, -H + 0.5, H, 0.5),
        box(0, H - 0.5, H, 0.5),
        box(-H + 0.5, 0, 0.5, H),
        box(H - 0.5, 0, 0.5, H),
        ...NOOK_WALLS.map(([x, z, hw, hd]) => box(x, z, hw, hd)),
        // bridge railings (posts sit 0.12 m inside the deck edge)
        ...BRIDGES.flatMap((b) => [box(b.x - b.halfWidth, streamCenterZ(b.x), 0.12, b.halfLength), box(b.x + b.halfWidth, streamCenterZ(b.x), 0.12, b.halfLength)]),
        ...LANDMARK_COLLIDERS,
      ],
      mode: "walk",
      respawn: GARDEN.spawn,
    });
    // Resume state: the tree is already blooming once the flowers were offered.
    const progress = useProgressStore.getState();
    fx.gardenBloom = progress.completedScenes.includes("memory-tree") ? 1 : 0;
    game.notifyEnvironmentReady("memory-garden");
    return () => {
      game.notifyEnvironmentUnmounted("memory-garden");
      setWorld(null);
    };
  }, []);

  // Scene 06 — reach the pavilion
  useFrame(() => {
    if (sceneId !== "blooming-garden" || reached.current || phase !== "playing") return;
    const p = runtime.player.position;
    if (Math.hypot(p.x, p.z) < 3.6) {
      reached.current = true;
      audio.sfx("sparkle");
      game.advanceObjective("reach-pavilion");
    }
  });

  // Scene 09 — offer the flowers at the roots
  const offerPos = useMemo(() => new THREE.Vector3(GARDEN.treeOffer[0], getHeight(GARDEN.treeOffer[0], GARDEN.treeOffer[2]) + 0.6, GARDEN.treeOffer[2]), []);
  const flowersOwned = story.memories.length > 0 ? [1, 2, 3, 4, 5].filter((n) => inventory.includes(`flower-${n}`)).length : 0;
  useInteractable(
    sceneId === "memory-tree"
      ? {
          id: "memory-tree-offer",
          position: offerPos,
          radius: 3,
          label: flowersOwned >= 5 ? "Letakkan bunga" : `Bunga belum lengkap (${flowersOwned}/5)`,
          icon: "flower",
          priority: 8,
          enabled: flowersOwned >= 5,
          onInteract: () => {
            if (offering.current) return;
            offering.current = true;
            void offerFlowers();
          },
        }
      : null,
  );

  const offerFlowers = async () => {
    const t = GARDEN.memoryTree;
    runtime.player.yaw = Math.PI;
    await game.playCinematic(
      (tl, { rig }) => {
        setCamera(tl, rig, [t[0] + 5, 2.2, t[2] + 9], [t[0], 3, t[2]]);
        tl.call(() => audio.sfx("bloom", { volume: 0.9 }), [], 0.6);
        tl.to(fx, { gardenBloom: 1, duration: 4.5, ease: "sine.inOut" }, 0.6);
        moveCamera(tl, rig, { position: [t[0] - 6, 4.5, t[2] + 12], target: [t[0], 6, t[2]], duration: 5.5, at: 0 });
        hold(tl, 0.5);
      },
      { skippable: false },
    );
    game.advanceObjective("offer-flowers", { delay: 300 });
  };

  const scatterData = useMemo(() => {
    const bounds: [number, number, number, number] = [-H, H, -H, H];
    const lawn = (x: number, z: number) => inGarden(x, z) && !inGrove(x, z) && !inKnoll(x, z) && !inNook(x, z);
    const trees = scatter({ count: 58, seed: 201, area: lawn, bounds, scale: [0.8, 1.3], avoid, avoidRadius: 4, spacing: 4 });
    const fallTrees = scatter({ count: 16, seed: 211, area: (x, z) => lawn(x, z) && z > 8 && Math.abs(x) > 8, bounds, scale: [0.8, 1.2], avoid, avoidRadius: 4, spacing: 4.5 });
    const willows = scatter({ count: 22, seed: 205, area: (x, z) => inGarden(x, z) && inGrove(x, z), bounds, scale: [0.9, 1.4], avoid, avoidRadius: 3.5, spacing: 3.2 });
    const pines = scatter({ count: 18, seed: 206, area: (x, z) => inGarden(x, z) && inKnoll(x, z), bounds, scale: [0.9, 1.3], avoid, avoidRadius: 3.5, spacing: 3 });
    const rocks = scatter({ count: 34, seed: 202, area: inGarden, bounds, scale: [0.4, 0.9], avoid, avoidRadius: 2.5 });
    const bushes = scatter({ count: 60, seed: 207, area: (x, z) => inGarden(x, z) && (nearHedge(x, z) || streamDistance(x, z) < 6), bounds, scale: [0.7, 1.2], avoid, avoidRadius: 2.5, spacing: 2 });
    const grass = scatter({ count: 1500, seed: 203, area: (x, z) => isWalkable(x, z) && !inWater(x, z) && Math.hypot(x, z) > 4.5, bounds, scale: [0.7, 1.3], avoid: [GARDEN.memoryTree], avoidRadius: 2.5 });
    const flowers = scatter({ count: 900, seed: 204, area: (x, z) => isWalkable(x, z) && !inWater(x, z) && Math.hypot(x, z) > 4.8 && inMeadow(x, z), bounds, scale: [0.7, 1.2], avoid: [GARDEN.memoryTree, ...GARDEN.flowers], avoidRadius: 2.2 });
    const sparseFlowers = scatter({ count: 260, seed: 208, area: (x, z) => isWalkable(x, z) && !inWater(x, z) && Math.hypot(x, z) > 4.8 && !inMeadow(x, z), bounds, scale: [0.7, 1.1], avoid: [GARDEN.memoryTree, ...GARDEN.flowers], avoidRadius: 2.2 });
    const lilies = scatter({ count: 40, seed: 209, area: (x, z) => isWalkable(x, z) && streamDistance(x, z) < STREAM.halfWidth - 0.3 && !BRIDGES.some((b) => Math.abs(x - b.x) < b.halfWidth + 1), bounds, scale: [0.8, 1.3], spacing: 1.2 });
    const mushrooms = scatter({ count: 24, seed: 210, area: (x, z) => inGarden(x, z) && inGrove(x, z), bounds, scale: [0.8, 1.4], avoid, avoidRadius: 2, spacing: 1.5 });
    return { trees, fallTrees, willows, pines, rocks, bushes, grass, flowers: [...flowers, ...sparseFlowers], lilies, mushrooms };
  }, []);

  useFrame((_, dt) => {
    // The whole garden warms up as the tree blooms.
    const b = fx.gardenBloom;
    if (fog.current) fog.current.color.lerp(new THREE.Color(b > 0.5 ? "#4a2a5a" : "#2a1a4a"), THREE.MathUtils.damp(0, 1, 1, dt));
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.damp(ambient.current.intensity, 0.5 + b * 0.35, 1, dt);
    const u = skyRef.current;
    if (u) {
      u.uSun.value = THREE.MathUtils.damp(u.uSun.value as number, 0.6 + b * 0.5, 1, dt);
      u.uNebula.value = THREE.MathUtils.damp(u.uNebula.value as number, 0.7 + b * 0.3, 1, dt);
    }
  });

  const showFlowers = sceneId === "little-things" || sceneId === "memory-in-the-air" || sceneId === "memory-tree";
  const showPolaroids = sceneId !== "blooming-garden";

  return (
    <group>
      <SkyDome
        palette={DUSK_SKY}
        onFrame={(u) => {
          skyRef.current = u;
        }}
      />
      <fog ref={fog} attach="fog" args={["#2a1a4a", 30, 110]} />
      <ambientLight ref={ambient} color="#b9a7ff" intensity={0.5} />
      <hemisphereLight color="#ff9fc4" groundColor="#1a2a1a" intensity={0.5} />
      <directionalLight
        position={[18, 20, -10]}
        color="#ffcfa8"
        intensity={1.1}
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />

      <Ground size={H * 2 + 20} segments={176} getHeight={getHeight} colorAt={colorAt} />
      <HedgeWalls
        walls={[
          [0, -H, H + 1, 0.9],
          [0, H, H + 1, 0.9],
          [-H, 0, 0.9, H + 1],
          [H, 0, 0.9, H + 1],
          ...NOOK_WALLS,
        ]}
        getHeight={(x, z) => groundHeight(THREE.MathUtils.clamp(x, -H + 1, H - 1), THREE.MathUtils.clamp(z, -H + 1, H - 1)) - 0.3}
      />

      {/* the stream + bridges */}
      <Stream centerZ={streamCenterZ} surfaceY={(x) => surfaceY(x)} xMin={-H - 10} xMax={H + 10} halfWidth={STREAM.halfWidth + 0.35} segments={160} deep="#1b3a66" shallow="#4f9fd4" foam="#e6f6ff" />
      {BRIDGES.map((b) => (
        <PlankBridge key={b.x} x={b.x} centerZ={streamCenterZ(b.x)} halfLength={b.halfLength} halfWidth={b.halfWidth} getHeight={getHeight} getBedHeight={groundHeight} />
      ))}
      <Lilies placements={scatterData.lilies} />

      {/* stepping-stone routes */}
      {Object.entries(PATHS).map(([key, pts]) => (
        <StonePath key={key} points={pts} getHeight={getHeight} spacing={1.5} color="#8a82a4" radius={0.46} />
      ))}

      <Pavilion />
      <StoneDisc position={[0, getHeight(0, GARDEN.spawn[2]) - 0.06, GARDEN.spawn[2]]} radius={2.3} color="#8a7fa8" height={0.08} />
      <GateArch />

      <Trees placements={scatterData.trees} getHeight={getHeight} leafColors={["#ff9fc4", "#ffb7d5", "#d98fc0", "#8fc48f"]} trunkColor="#5a4068" />
      <Trees placements={scatterData.fallTrees} getHeight={getHeight} variant="fall" leafColors={["#f3a06a", "#e9c46a", "#f28482"]} trunkColor="#5a4068" />
      <Trees placements={scatterData.willows} getHeight={getHeight} variant="willow" leafColors={["#9fd1b8", "#7fb8a3", "#c7e3d0"]} trunkColor="#4a3a52" wind={1.1} />
      <Trees placements={scatterData.pines} getHeight={getHeight} variant="pine" leafColors={["#3f7a5b", "#5b8f6f", "#2f6a4c"]} trunkColor="#4a3552" wind={0.4} />
      <Rocks placements={scatterData.rocks} getHeight={getHeight} color="#6b6484" />
      <Bushes placements={scatterData.bushes} getHeight={getHeight} color="#3b7a52" />
      <GrassTufts placements={scatterData.grass} getHeight={getHeight} color="#4f9a6d" />
      <FlowerField placements={scatterData.flowers} getHeight={getHeight} />
      <Mushrooms placements={scatterData.mushrooms} />
      <MemoryTree />

      {/* Willow grove (north-west): a bench under hanging lanterns */}
      <Bench position={[GARDEN.memorySpots.grove[0] + 1.5, getHeight(GARDEN.memorySpots.grove[0] + 1.5, GARDEN.memorySpots.grove[2] + 1), GARDEN.memorySpots.grove[2] + 1]} rotationY={-0.6} />
      {GROVE_HOOKS.map((h, i) => (
        <group key={i}>
          <LanternHook position={h.position} rotationY={h.rotationY} />
          <Lantern style="hanging" position={lanternHookTip(h.position, h.rotationY)} color="#c9f0ff" light={preset.shadows && i === 0} scale={0.6} />
        </group>
      ))}
      <MemorySpot id="garden-grove" position={GARDEN.memorySpots.grove} lines={story.dialogue.gardenGrove} />

      {/* Pine knoll (north-east): a ring of standing stones on the summit */}
      <StoneCircle center={GARDEN.memorySpots.knoll} />
      <MemorySpot id="garden-knoll" position={GARDEN.memorySpots.knoll} lines={story.dialogue.gardenKnoll} />

      {/* South-west hill: a lone lantern post looking back over the stream */}
      <Lantern style="double" position={[HILLS[0].x + 2, getHeight(HILLS[0].x + 2, HILLS[0].z - 3), HILLS[0].z - 3]} color="#ffd27a" light={preset.shadows} />

      {/* hidden keepsakes */}
      {GARDEN.secrets.map((pos, i) => (
        <Keepsake key={i} id={["keepsake-ch2-nook", "keepsake-ch2-tree", "keepsake-ch2-rocks"][i]} position={[pos[0], getHeight(pos[0], pos[2]), pos[2]]} />
      ))}

      {/* lantern path from the gate over the bridge to the pavilion and on to the tree */}
      {[
        [-2.6, GARDEN.spawn[2] - 6],
        [2.6, GARDEN.spawn[2] - 6],
        [-2.6, streamCenterZ(0) + 6.5],
        [2.6, streamCenterZ(0) + 6.5],
        [-2.6, streamCenterZ(0) - 6.5],
        [2.6, streamCenterZ(0) - 6.5],
        [-2.8, 9],
        [2.8, 9],
        [-3, -9],
        [3, -9],
        [-4, -17],
        [4, -17],
        [-24 - 2.4, streamCenterZ(-24) + 6],
        [26 + 2.4, streamCenterZ(26) + 6],
      ].map(([x, z], i) => (
        <Lantern key={i} position={[x, getHeight(x, z), z]} color="#ffd27a" light={preset.shadows && i % 4 === 0} />
      ))}

      <GlowMarker position={[0, getHeight(0, 0) + 0.5, 0]} active={sceneId === "blooming-garden"} color="#ff9fc4" />
      <GlowMarker position={[GARDEN.treeOffer[0], getHeight(GARDEN.treeOffer[0], GARDEN.treeOffer[2]), GARDEN.treeOffer[2]]} active={sceneId === "memory-tree" && flowersOwned >= 5} color="#ff9fc4" radius={1.6} />

      {showFlowers &&
        GARDEN.flowers.map((pos, i) => (
          <Collectible
            key={i}
            id={`flower-${i + 1}`}
            position={[pos[0], getHeight(pos[0], pos[2]), pos[2]]}
            label="Petik bunga"
            icon="flower"
            shape="flower"
            hover={0.7}
            color={FLOWER_COLORS[i]}
            onCollect={() => {
              if (!game.collect(`flower-${i + 1}`, { sfx: "collect-flower" })) return false;
              if (sceneId === "little-things") game.advanceObjective("collect-flowers");
              return true;
            }}
          />
        ))}

      {/* Polaroids suspend on their textures — keep that local so the world never unmounts. */}
      {showPolaroids && (
        <Suspense fallback={null}>
          {story.memories.map((_, i) => (
            <Polaroid key={i} index={i} active={sceneId === "memory-in-the-air" || sceneId === "memory-tree"} />
          ))}
        </Suspense>
      )}

      <Particles count={220} texture="petal" color={["#ff9fc4", "#ffd6e7", "#f3d08a"]} size={[0.1, 0.26]} area={[56, 12, 56]} center={[0, 6, 0]} velocity={[0.6, -0.35, 0.2]} jitter={0.5} sway={1} spin={1.5} twinkle={0.2} additive={false} seed={61} />
      <Particles count={140} texture="firefly" color={["#ffd27a", "#fff1c9"]} size={[0.06, 0.18]} area={[50, 5, 50]} center={[0, 1.5, 0]} velocity={[0.05, 0.08, 0.05]} jitter={0.5} sway={0.6} twinkle={1.8} seed={62} />
    </group>
  );
}
