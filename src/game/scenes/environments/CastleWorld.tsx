"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { story } from "@/config/story";
import { MODELS, type ModelId } from "@/config/models";
import { fx } from "@/game/engine/fx";
import { game } from "@/game/engine/GameManager";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { circle, setWorld, type Collider } from "@/game/engine/world";
import { Collectible, HeartMesh } from "@/game/objects/Collectible";
import { Bushes, FlowerField, GrassTufts, Lantern, Rocks, Trees, scatter } from "@/game/objects/Flora";
import { GlowMarker } from "@/game/objects/GlowMarker";
import { Model, ModelInstances, preloadModels, type Instance, type MaterialOverrides } from "@/game/objects/Model";
import { Particles } from "@/game/objects/Particles";
import { SkyDome, type SkyPalette } from "@/game/objects/SkyDome";
import { Ground, StoneDisc } from "@/game/objects/Terrain";
import { audio } from "@/game/systems/audio/AudioManager";
import { useQuality } from "@/game/systems/quality";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { CASTLE } from "../landmarks";
import { APPROACH, CH, COURTYARD, DOOR_HW, FACADE_Z, GATE_HW, HR, KEEP, MOAT, OUTER_Z, S, buildLayout, layoutModelUrls, pathTiles } from "./castle/layout";
import { getHeight, inCourtyard, inForest, inGrounds, isWalkable } from "./castle/terrain";

const layout = buildLayout();
const MODEL_URLS = layoutModelUrls(layout);

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

/** Nature-kit pieces come in a pastel palette; re-tint them for the moonlit grounds. */
const STONE: MaterialOverrides = {
  stone: { color: "#7d7596" },
  stoneDark: { color: "#5c5574" },
  _defaultMat: { color: "#8f88a8" },
  grass: { color: "#3f6a55" },
  dirt: { color: "#4a3d55" },
};
const PATH_STONE: MaterialOverrides = { stone: { color: "#6e6688" }, stoneDark: { color: "#524c68" }, _defaultMat: { color: "#6e6688" } };
const HEDGE: MaterialOverrides = { colormap: { color: "#9fb59a" } };
const PROP_OVERRIDES: Partial<Record<ModelId, MaterialOverrides>> = {
  natStatueRing: STONE,
  natStatueObelisk: STONE,
  natStatueColumn: STONE,
  natBridgeStone: { ...STONE, grass: { color: "#4b7a60" } },
  natPathStone: PATH_STONE,
  townHedgeLarge: HEDGE,
};

const AVOID: Array<[number, number, number]> = [CASTLE.spawn, CASTLE.gate, CASTLE.fountain, ...CASTLE.keys, [-18, 0, 8], [20, 0, -13], [0, 0, OUTER_Z - 4], [0, 0, FACADE_Z + 4]];

/* -------------------------------------------------------------------------- */
/*  Architecture                                                              */
/* -------------------------------------------------------------------------- */

/** Every castle-kit piece, one instanced mesh set per model. */
function Masonry() {
  return (
    <group>
      {(Object.entries(layout.pieces) as Array<[ModelId, Instance[] | undefined]>).map(([id, instances]) =>
        instances && instances.length > 0 ? <ModelInstances key={id} url={MODELS[id]} instances={instances} overrides={PROP_OVERRIDES[id]} castShadow={id !== "castleFlag"} /> : null,
      )}
    </group>
  );
}

/** Props (fountain, benches, hedges, columns…) grouped by model and dropped onto the terrain. */
function Props() {
  const groups = useMemo(() => {
    const map = new Map<ModelId, Instance[]>();
    for (const p of layout.props) {
      const list = map.get(p.model) ?? [];
      list.push({ position: [p.position[0], p.position[1] + getHeight(p.position[0], p.position[2]), p.position[2]], rotationY: p.ry ?? 0, scale: p.scale ?? 1 });
      map.set(p.model, list);
    }
    return [...map.entries()];
  }, []);
  return (
    <group>
      {groups.map(([id, instances]) => (
        <ModelInstances key={id} url={MODELS[id]} instances={instances} overrides={PROP_OVERRIDES[id]} />
      ))}
    </group>
  );
}

/** Fire baskets get embers and a flickering light. */
function Fires() {
  const spots = useMemo(() => layout.props.filter((p) => p.model === "graveFireBasket").map((p) => [p.position[0], getHeight(p.position[0], p.position[2]) + 0.45, p.position[2]] as [number, number, number]), []);
  const { preset } = useQuality();
  return (
    <group>
      {spots.map((pos, i) => (
        <group key={i} position={pos}>
          <Particles count={22} texture="spark" color={["#ffb347", "#ff7a3a"]} size={[0.05, 0.16]} area={[0.5, 1.2, 0.5]} center={[0, 0.5, 0]} velocity={[0, 0.9, 0]} jitter={0.35} sway={0.2} twinkle={2} seed={120 + i} />
          <Particles count={8} texture="glow" color="#ff9a4a" size={[0.35, 0.7]} area={[0.3, 0.3, 0.3]} center={[0, 0.1, 0]} velocity={[0, 0.3, 0]} jitter={0.2} twinkle={3} seed={160 + i} opacity={0.7} />
          {preset.shadows && i % 2 === 0 && <FlickerLight />}
        </group>
      ))}
    </group>
  );
}

function FlickerLight() {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.intensity = 5 + Math.sin(clock.elapsedTime * 11) * 0.8 + Math.sin(clock.elapsedTime * 27) * 0.4;
  });
  return <pointLight ref={ref} position={[0, 0.4, 0]} color="#ff9a4a" intensity={5} distance={9} decay={2} />;
}

/** The sealed keep gate: two kit door leaves on hinges, a glowing crest and a lantern. */
function Gate({ open }: { open: () => number }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const k = useRef(0);
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.damp(k.current, open(), 1.5, dt);
    const a = k.current * 1.75;
    if (left.current) left.current.rotation.y = -a;
    if (right.current) right.current.rotation.y = a;
    if (glow.current) glow.current.emissiveIntensity = 0.6 + k.current * 2.4;
  });
  const leafScale: [number, number, number] = [S, 6.5, GATE_HW / 0.66];
  return (
    <group position={[0, 0.15, FACADE_Z + S / 2 - 0.3]}>
      <group ref={left} position={[-GATE_HW, 0, 0]}>
        <Model url={MODELS.castleGate} position={[GATE_HW / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={leafScale} />
      </group>
      <group ref={right} position={[GATE_HW, 0, 0]}>
        <Model url={MODELS.castleGate} position={[-GATE_HW / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={leafScale} />
      </group>
      {/* keyhole crest */}
      <mesh position={[0, 7.2, 1.6]}>
        <circleGeometry args={[0.7, 24]} />
        <meshStandardMaterial ref={glow} color="#ffd27a" emissive="#ffd27a" emissiveIntensity={0.6} />
      </mesh>
      <pointLight position={[0, 5, 3]} color="#ffd27a" intensity={7} distance={16} decay={2} />
    </group>
  );
}

function InnerDoor({ open }: { open: () => number }) {
  const door = useRef<THREE.Mesh>(null);
  const k = useRef(0);
  const z = CASTLE.innerDoor[2];
  useFrame((_, dt) => {
    k.current = THREE.MathUtils.damp(k.current, open(), 1.5, dt);
    if (door.current) door.current.position.y = 2.6 - k.current * 5;
  });
  return (
    <group position={[0, 0, z]}>
      <mesh ref={door} position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[DOOR_HW * 2, 5.2, 0.4]} />
        <meshStandardMaterial color="#6b5fa0" emissive="#b9a7ff" emissiveIntensity={0.4} roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 5.6, 0]}>
        <boxGeometry args={[DOOR_HW * 2 + 2.4, 1, 1.2]} />
        <meshStandardMaterial color="#5a5478" roughness={0.9} />
      </mesh>
      <pointLight position={[0, 4, 2]} color="#b9a7ff" intensity={4} distance={12} decay={2} />
    </group>
  );
}

/** Keep body, chamber interior, heart dome and floors (simple volumes behind the kit facade). */
function KeepVolumes() {
  return (
    <group>
      {/* keep body (interior walls visible from inside, exterior from above) */}
      <mesh position={[0, KEEP.height / 2, (KEEP.minZ + KEEP.maxZ) / 2]} castShadow receiveShadow>
        <boxGeometry args={[KEEP.halfW * 2, KEEP.height, KEEP.maxZ - KEEP.minZ]} />
        <meshStandardMaterial color="#4a4466" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* interior floor + ceiling slabs */}
      <mesh position={[0, 0.05, (KEEP.minZ + KEEP.maxZ) / 2]} receiveShadow>
        <boxGeometry args={[KEEP.halfW * 2 - 0.2, 0.2, KEEP.maxZ - KEEP.minZ - 0.2]} />
        <meshStandardMaterial color="#3b3652" roughness={0.9} />
      </mesh>
      {/* heart room */}
      <StoneDisc position={[0, 0.06, CASTLE.heartRoom[2]]} radius={HR + 1} color="#4a4466" height={0.1} />
      <mesh position={[CASTLE.heartRoom[0], 0, CASTLE.heartRoom[2]]}>
        <sphereGeometry args={[HR + 1.2, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#3a3552" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      {/* corridor between chamber and heart room */}
      <mesh position={[0, 3, (CASTLE.innerDoor[2] + CASTLE.heartRoom[2] + HR) / 2 - 0.5]}>
        <boxGeometry args={[DOOR_HW * 2 + 2, 6, Math.abs(CASTLE.heartRoom[2] + HR - CASTLE.innerDoor[2]) + 2]} />
        <meshStandardMaterial color="#3a3552" roughness={0.95} side={THREE.BackSide} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh key={i} position={[CASTLE.heartRoom[0] + Math.cos(a) * (HR + 0.5), 4, CASTLE.heartRoom[2] + Math.sin(a) * (HR + 0.5)]} rotation={[0, -a + Math.PI / 2, 0]}>
            <planeGeometry args={[1.4, 4]} />
            <meshStandardMaterial color="#ff9fc4" emissive="#ff6fa3" emissiveIntensity={1.2} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function Moat() {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.emissiveIntensity = 0.25 + Math.sin(clock.elapsedTime * 0.8) * 0.05;
  });
  return (
    <mesh position={[0, -0.55, (MOAT.minZ + MOAT.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[100, MOAT.maxZ - MOAT.minZ + 1.5]} />
      <meshStandardMaterial ref={mat} color="#1f3f6e" emissive="#244a7a" emissiveIntensity={0.25} roughness={0.12} metalness={0.5} transparent opacity={0.9} />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/*  Story objects                                                             */
/* -------------------------------------------------------------------------- */

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
          radius: 2.8,
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
      orb.current.position.y = 1.75 + Math.sin(clock.elapsedTime * 1.4 + index) * 0.08;
    }
  });

  return (
    <group position={[p[0], 0.15, p[2]]} onClick={(e) => (e.stopPropagation(), triggerInteraction(`pedestal-${index}`))}>
      <Model url={MODELS.graveAltarStone} scale={[1.6, 2.6, 1.6]} overrides={{ colormap: { color: "#b8b0d0" } }} />
      <mesh ref={orb} position={[0, 1.75, 0]}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={unlocked ? 2.5 : 0.5} roughness={0.2} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, 1.8, 0]} color={color} intensity={unlocked ? 6 : 1.5} distance={7} decay={2} />
      {unlocked && <Particles count={16} texture="spark" color={color} size={[0.04, 0.12]} area={[1, 1.4, 1]} center={[0, 1.8, 0]} velocity={[0, 0.3, 0]} twinkle={1.5} seed={90 + index} />}
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
          radius: 4.5,
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
      <StoneDisc position={[0, 0.15, 0]} radius={2.6} color="#5e5680" height={0.4} />
      <Model url={MODELS.graveAltarStone} position={[0, 0.55, 0]} scale={[2.2, 2.8, 2.2]} overrides={{ colormap: { color: "#c0b4d8" } }} />
      <group ref={heart} position={[0, h[1], 0]} onClick={(e) => (e.stopPropagation(), triggerInteraction("crystal-heart"))}>
        <HeartMesh color="#ff4f8a" scale={0.95} emissiveIntensity={1.6} />
        <mesh>
          <sphereGeometry args={[1.6, 20, 16]} />
          <meshBasicMaterial color="#ff8fb8" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, h[1], 0]} color="#ff6fa3" intensity={10} distance={30} decay={2} />
      <Particles count={120} texture="heart" color={["#ff8fb8", "#ffd6e7"]} size={[0.08, 0.22]} area={[9, 8, 9]} center={[0, 3, 0]} velocity={[0, 0.4, 0]} jitter={0.4} sway={0.5} spin={0.5} twinkle={1.2} seed={95} />
      <Particles count={90} texture="spark" color="#fff1c9" size={[0.04, 0.12]} area={[14, 7, 14]} center={[0, 3, 0]} velocity={[0, 0.2, 0]} jitter={0.3} sway={0.3} twinkle={2} seed={96} />
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

  const scatterData = useMemo(() => {
    const bounds: [number, number, number, number] = [COURTYARD.minX, COURTYARD.maxX, FACADE_Z, OUTER_Z];
    const trees = scatter({ count: 26, seed: 401, area: inGrounds, bounds, scale: [0.8, 1.2], avoid: AVOID, avoidRadius: 7, spacing: 4 });
    const oaks = scatter({ count: 10, seed: 406, area: (x, z) => inGrounds(x, z) && Math.abs(x) > 22, bounds, scale: [0.9, 1.2], avoid: AVOID, avoidRadius: 6, spacing: 5 });
    const forest = scatter({ count: 240, seed: 405, area: inForest, bounds: [-82, 82, -88, 76], scale: [0.9, 1.5], spacing: 3.4 });
    const rocks = scatter({ count: 18, seed: 402, area: inGrounds, bounds, scale: [0.5, 1], avoid: AVOID, avoidRadius: 4, spacing: 3 });
    const forestRocks = scatter({ count: 40, seed: 407, area: inForest, bounds: [-82, 82, -88, 76], scale: [0.7, 1.6], spacing: 4 });
    const grass = scatter({ count: 900, seed: 403, area: (x, z) => (inCourtyard(x, z) && Math.abs(x) > 3.2) || (Math.abs(x) < APPROACH.halfWidth + 6 && Math.abs(x) > 3.2 && z > MOAT.maxZ + 1 && z < APPROACH.maxZ + 4), bounds: [-32, 32, FACADE_Z, APPROACH.maxZ + 4], scale: [0.6, 1.2], avoid: [CASTLE.fountain], avoidRadius: 4 });
    const bushes = scatter({ count: 36, seed: 408, area: (x, z) => inCourtyard(x, z) && (Math.abs(x) > 27 || z > OUTER_Z - 5 || z < FACADE_Z + 6) && Math.abs(x) > 7, bounds, scale: [0.7, 1.2], avoid: AVOID, avoidRadius: 4, spacing: 2.5 });
    const westFlowers = scatter({ count: 70, seed: 409, area: (x, z) => Math.abs(x + 18) < 6 && Math.abs(z - 8) < 4 && Math.hypot(x + 18, z - 8) > 1.8, bounds: [-25, -11, 3, 13], scale: [0.8, 1.2], avoid: [CASTLE.keys[0]], avoidRadius: 1.2 });
    const eastFlowers = scatter({ count: 40, seed: 410, area: (x, z) => Math.abs(x - 20) < 4 && Math.abs(z + 13) < 3, bounds: [15, 25, -17, -9], scale: [0.8, 1.2], avoid: [CASTLE.keys[2]], avoidRadius: 1.2 });
    const treeColliders: Collider[] = [...trees, ...oaks].map((p) => circle(p.x, p.z, 0.5 * p.s));
    return { trees, oaks, forest, rocks, forestRocks, grass, bushes, flowers: [...westFlowers, ...eastFlowers], treeColliders };
  }, []);

  useEffect(() => {
    preloadModels(MODEL_URLS);
    setWorld({ id: "castle", getHeight, isWalkable, colliders: [...layout.colliders, ...scatterData.treeColliders], mode: "walk", respawn: CASTLE.spawn });
    const completed = useProgressStore.getState().completedScenes;
    fx.castleGate = completed.includes("three-keys") ? 1 : 0;
    fx.castleInnerDoor = completed.includes("unspoken-words") ? 1 : 0;
    game.notifyEnvironmentReady("castle");
    return () => {
      game.notifyEnvironmentUnmounted("castle");
      setWorld(null);
    };
  }, [scatterData]);

  // Scene 16 — reach the gate; scene 19 — reach the heart room
  useFrame(() => {
    if (phase !== "playing") return;
    const p = runtime.player.position;
    if (sceneId === "forgotten-castle" && !reachedGate.current && Math.hypot(p.x - CASTLE.gate[0], p.z - CASTLE.gate[2]) < 2.6) {
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

  const tiles = useMemo(() => pathTiles(getHeight), []);
  const showKeys = sceneId === "three-keys";
  const showPedestals = sceneId === "unspoken-words" || sceneId === "heart-chamber";

  return (
    <group>
      <SkyDome palette={SKY} />
      <fog attach="fog" args={["#140f2e", 40, 170]} />
      <ambientLight color="#8d8ad6" intensity={0.45} />
      <hemisphereLight color="#6a5fb0" groundColor="#0e0a1e" intensity={0.55} />
      <directionalLight
        position={[30, 40, -20]}
        color="#b9c4ff"
        intensity={0.9}
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-bias={-0.0006}
      />

      <Ground size={CASTLE.halfSize * 2 + 50} getHeight={getHeight} color="#2f4a3e" segments={128} />
      <Moat />
      <ModelInstances url={MODELS.natPathStone} instances={tiles} overrides={PATH_STONE} castShadow={false} />

      <Masonry />
      <Props />
      <Fires />
      <KeepVolumes />
      <Gate open={() => fx.castleGate} />
      <InnerDoor open={() => fx.castleInnerDoor} />

      {/* fountain water + spray */}
      <group position={[CASTLE.fountain[0], getHeight(CASTLE.fountain[0], CASTLE.fountain[2]), CASTLE.fountain[2]]}>
        <Particles count={48} texture="glow" color="#bfe0ff" size={[0.05, 0.14]} area={[1.4, 1.8, 1.4]} center={[0, 2.2, 0]} velocity={[0, -0.7, 0]} gravity={0.5} jitter={0.3} twinkle={1} seed={97} />
        <pointLight position={[0, 1.8, 0]} color="#8fc4ff" intensity={3} distance={9} decay={2} />
      </group>

      <Trees placements={scatterData.trees} getHeight={getHeight} variant="pine" leafColors={["#2f5f6a", "#3a6a7a", "#2a4f5a"]} trunkColor="#3a2a3a" />
      <Trees placements={scatterData.oaks} getHeight={getHeight} variant="round" leafColors={["#3f6f5f", "#355f55", "#4a7a6a"]} trunkColor="#3a2a3a" />
      <Trees placements={scatterData.forest} getHeight={getHeight} variant="pine" leafColors={["#243f4e", "#2a4a58", "#1f3a46"]} trunkColor="#2a2030" castShadow={false} />
      <Rocks placements={scatterData.rocks} getHeight={getHeight} color="#4f4868" mossColor="#3f6a55" />
      <Rocks placements={scatterData.forestRocks} getHeight={getHeight} color="#3f3a55" mossColor="#2f4f45" scale={1.4} />
      <Bushes placements={scatterData.bushes} getHeight={getHeight} color="#35604c" />
      <FlowerField placements={scatterData.flowers} getHeight={getHeight} colors={["#ff8fb8", "#f3d08a", "#b9a7ff", "#ffffff"]} stemColor="#3f6a55" />
      <GrassTufts placements={scatterData.grass} getHeight={getHeight} color="#3f7a5a" />

      {layout.lanterns.map(([x, z, ry, kind], i) => (
        <Lantern key={i} position={[x, getHeight(x, z), z]} rotationY={ry} style={kind === 1 ? "post" : "double"} color="#ffb347" light={preset.shadows && i % 4 === 1} />
      ))}
      {/* chamber light */}
      <pointLight position={[0, 7, CASTLE.chamberCenter[2]]} color="#ffb98a" intensity={5} distance={26} decay={2} />

      <GlowMarker position={[CASTLE.gate[0], getHeight(CASTLE.gate[0], CASTLE.gate[2]), CASTLE.gate[2]]} active={sceneId === "forgotten-castle"} color="#f3d08a" />
      <GlowMarker position={[0, 0.15, CASTLE.chamberCenter[2] + CH.d - 2]} active={sceneId === "unspoken-words"} color="#f3d08a" beam={false} />
      <GlowMarker position={[CASTLE.heartRoom[0], 0.2, CASTLE.heartRoom[2] + 7]} active={sceneId === "heart-chamber"} color="#ff8fb8" />

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
      <Particles count={110} texture="cloud" color="#4a4a7a" size={[10, 22]} area={[150, 7, 160]} center={[0, 1.5, -10]} velocity={[0.4, 0, 0.1]} jitter={0.02} sway={0.1} twinkle={0.05} opacity={0.2} spin={0.02} seed={98} renderOrder={-1} />
      <Particles count={160} texture="spark" color={["#ffb347", "#ff8a5a"]} size={[0.04, 0.12]} area={[70, 12, 110]} center={[0, 4, 0]} velocity={[0.05, 0.35, 0]} jitter={0.4} sway={0.6} twinkle={1.8} seed={99} />
    </group>
  );
}
