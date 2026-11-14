"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { story } from "@/config/story";
import { fx } from "@/game/engine/fx";
import { game } from "@/game/engine/GameManager";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { box, circle, setWorld } from "@/game/engine/world";
import { hold, moveCamera, setCamera } from "@/game/animations/camera";
import { Collectible, HeartMesh } from "@/game/objects/Collectible";
import { FlowerField, GrassTufts, Lantern, Rocks, Trees, scatter } from "@/game/objects/Flora";
import { GlowMarker } from "@/game/objects/GlowMarker";
import { Particles } from "@/game/objects/Particles";
import { SkyDome, type SkyPalette } from "@/game/objects/SkyDome";
import { Ground, StoneDisc, makeRollingHeight } from "@/game/objects/Terrain";
import { audio } from "@/game/systems/audio/AudioManager";
import { useQuality } from "@/game/systems/quality";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { GARDEN } from "../landmarks";
import { createRng } from "@/lib/math";

const H = GARDEN.halfSize;
const flatSpots: Array<[number, number, number]> = [
  [0, 0, 7],
  [GARDEN.memoryTree[0], GARDEN.memoryTree[2], 6],
  [0, 22, 3],
];
const getHeight = makeRollingHeight(22, 0.4, 0.09, flatSpots);
const isWalkable = (x: number, z: number) => Math.abs(x) < H - 1 && Math.abs(z) < H - 1;
const inGarden = (x: number, z: number) => Math.abs(x) < H - 1.5 && Math.abs(z) < H - 1.5 && Math.hypot(x, z) > 6.5;
const avoid: Array<[number, number, number]> = [GARDEN.spawn, GARDEN.pavilion, GARDEN.memoryTree, GARDEN.treeOffer, ...GARDEN.flowers];

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
      <StoneDisc position={[0, 0, 0]} radius={4.2} color="#8a7fa8" height={0.25} />
      <StoneDisc position={[0, 0.25, 0]} radius={3.4} color="#9b90b8" height={0.2} />
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.9, 2.0, Math.sin(a) * 2.9]} castShadow>
            <cylinderGeometry args={[0.16, 0.2, 3.4, 10]} />
            <meshStandardMaterial color="#f1e7ff" roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 3.85, 0]} castShadow>
        <coneGeometry args={[3.8, 1.4, 6]} />
        <meshStandardMaterial color="#5e3f7a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.7, 0]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        <meshStandardMaterial color="#ffd6e7" emissive="#ff8fb8" emissiveIntensity={1.4} />
      </mesh>
      <pointLight position={[0, 3.2, 0]} color="#ffc6dc" intensity={8} distance={14} decay={2} />
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
    const trees = scatter({ count: 34, seed: 201, area: inGarden, bounds: [-H, H, -H, H], scale: [0.8, 1.3], avoid, avoidRadius: 3.5 });
    const rocks = scatter({ count: 20, seed: 202, area: inGarden, bounds: [-H, H, -H, H], scale: [0.4, 0.9], avoid, avoidRadius: 2 });
    const grass = scatter({ count: 700, seed: 203, area: (x, z) => isWalkable(x, z) && Math.hypot(x, z) > 4.5, bounds: [-H, H, -H, H], scale: [0.7, 1.3], avoid: [GARDEN.memoryTree], avoidRadius: 2.5 });
    const flowers = scatter({ count: 420, seed: 204, area: (x, z) => isWalkable(x, z) && Math.hypot(x, z) > 4.8, bounds: [-H, H, -H, H], scale: [0.7, 1.2], avoid: [GARDEN.memoryTree, ...GARDEN.flowers], avoidRadius: 2.2 });
    return { trees, rocks, grass, flowers };
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

      <Ground size={H * 2 + 20} getHeight={getHeight} color="#2f6a48" />
      {/* hedge walls */}
      {[
        [0, -H, H + 1, 0.9],
        [0, H, H + 1, 0.9],
        [-H, 0, 0.9, H + 1],
        [H, 0, 0.9, H + 1],
      ].map(([x, z, hw, hd], i) => (
        <mesh key={i} position={[x, 1.1, z]} castShadow receiveShadow>
          <boxGeometry args={[hw * 2, 2.2, hd * 2]} />
          <meshStandardMaterial color="#2a5a3e" roughness={1} />
        </mesh>
      ))}

      <Pavilion />
      <StoneDisc position={[0, getHeight(0, 22), 22]} radius={2.2} color="#8a7fa8" />
      <Trees placements={scatterData.trees} getHeight={getHeight} leafColors={["#ff9fc4", "#ffb7d5", "#d98fc0", "#8fc48f"]} trunkColor="#5a4068" />
      <Rocks placements={scatterData.rocks} getHeight={getHeight} color="#6b6484" />
      <GrassTufts placements={scatterData.grass} getHeight={getHeight} color="#4f9a6d" />
      <FlowerField placements={scatterData.flowers} getHeight={getHeight} />
      <MemoryTree />

      {/* lantern path from the gate to the pavilion and on to the tree */}
      {[
        [-2.5, 17],
        [2.5, 17],
        [-2.5, 10],
        [2.5, 10],
        [-3, -8],
        [3, -8],
        [-4, -13],
        [4, -13],
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
