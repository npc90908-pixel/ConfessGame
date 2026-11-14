"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { story } from "@/config/story";
import { fx } from "@/game/engine/fx";
import { game } from "@/game/engine/GameManager";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { circle, setWorld } from "@/game/engine/world";
import { hold, moveCamera, setCamera } from "@/game/animations/camera";
import { Collectible } from "@/game/objects/Collectible";
import { Crystals, GrassTufts, Lantern, Rocks, Trees, scatter } from "@/game/objects/Flora";
import { GlowMarker } from "@/game/objects/GlowMarker";
import { Particles } from "@/game/objects/Particles";
import { Portal } from "@/game/objects/Portal";
import { NIGHT_SKY, SkyDome } from "@/game/objects/SkyDome";
import { FloatingIsland, StoneDisc, makeRollingHeight } from "@/game/objects/Terrain";
import { audio } from "@/game/systems/audio/AudioManager";
import { useQuality } from "@/game/systems/quality";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { SKY_ISLAND } from "../landmarks";
import { easeOutCubic } from "@/lib/math";

const R = SKY_ISLAND.radius;
const flatSpots: Array<[number, number, number]> = [
  [0, 4, 3],
  [SKY_ISLAND.marker[0], SKY_ISLAND.marker[2], 2.5],
  [SKY_ISLAND.portal[0], SKY_ISLAND.portal[2], 4],
  [SKY_ISLAND.envelopeLanding[0], SKY_ISLAND.envelopeLanding[2], 2],
];
const getHeight = makeRollingHeight(11, 0.32, 0.14, flatSpots);
const isWalkable = (x: number, z: number) => Math.hypot(x, z) < R - 0.9;
const avoid: Array<[number, number, number]> = [SKY_ISLAND.spawn, SKY_ISLAND.marker, SKY_ISLAND.portal, SKY_ISLAND.envelopeLanding, SKY_ISLAND.tree, ...SKY_ISLAND.lights];
const inIsland = (x: number, z: number) => Math.hypot(x, z) < R - 1.4;

const LIGHT_COLORS = ["#ffd27a", "#ff9fc4", "#b9a7ff"];

/* -------------------------------------------------------------------------- */
/*  Crystal tree                                                              */
/* -------------------------------------------------------------------------- */

function CrystalTree({ position }: { position: [number, number, number] }) {
  const leaves = useRef<THREE.Group>(null);
  const branches = useMemo(() => {
    const list: Array<{ rot: [number, number, number]; len: number; y: number }> = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      list.push({ rot: [0.9 + (i % 2) * 0.25, a, 0], len: 2.2 + (i % 3) * 0.5, y: 2.6 + (i % 3) * 0.5 });
    }
    return list;
  }, []);
  useFrame(({ clock }) => {
    if (leaves.current) leaves.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.05;
  });
  return (
    <group position={[position[0], getHeight(position[0], position[2]), position[2]]}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.7, 3.8, 9]} />
        <meshStandardMaterial color="#5a4470" roughness={0.9} />
      </mesh>
      <group ref={leaves}>
        {branches.map((b, i) => (
          <group key={i} position={[0, b.y, 0]} rotation={[0, b.rot[1], 0]}>
            <mesh position={[b.len * 0.45, b.len * 0.3, 0]} rotation={[0, 0, -0.9]} castShadow>
              <cylinderGeometry args={[0.08, 0.16, b.len, 6]} />
              <meshStandardMaterial color="#5a4470" roughness={0.9} />
            </mesh>
            <mesh position={[b.len * 0.9, b.len * 0.62, 0]}>
              <octahedronGeometry args={[0.7 + (i % 2) * 0.25, 0]} />
              <meshStandardMaterial color="#d7ccff" emissive="#b9a7ff" emissiveIntensity={0.9} roughness={0.2} transparent opacity={0.9} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 4.6, 0]}>
          <octahedronGeometry args={[1.3, 0]} />
          <meshStandardMaterial color="#ffd6e7" emissive="#ff8fb8" emissiveIntensity={1.1} roughness={0.2} transparent opacity={0.92} />
        </mesh>
      </group>
      <pointLight position={[0, 4.6, 0]} color="#d7a8ff" intensity={10} distance={16} decay={2} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Envelope that falls from the sky (Scene 03)                               */
/* -------------------------------------------------------------------------- */

function FallingEnvelope({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const [landed, setLanded] = useState(false);
  const landing = SKY_ISLAND.envelopeLanding;
  const groundY = getHeight(landing[0], landing[2]);
  const pos = useMemo(() => new THREE.Vector3(landing[0], groundY + 0.4, landing[2]), [landing, groundY]);

  useInteractable(
    active && landed
      ? {
          id: "first-envelope",
          position: pos,
          radius: 2.4,
          label: story.letters.firstMessage.title,
          icon: "letter",
          priority: 5,
          onInteract: onOpen,
        }
      : null,
  );

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    if (!active) {
      g.visible = false;
      return;
    }
    g.visible = true;
    if (progress.current < 1) {
      progress.current = Math.min(1, progress.current + dt / 4.2);
      const t = easeOutCubic(progress.current);
      const sway = (1 - t) * 1.6;
      g.position.set(landing[0] + Math.sin(clock.elapsedTime * 2.1) * sway, THREE.MathUtils.lerp(26, groundY + 0.4, t), landing[2] + Math.cos(clock.elapsedTime * 1.7) * sway);
      g.rotation.set(Math.sin(clock.elapsedTime * 2.5) * 0.5 * (1 - t), clock.elapsedTime * 0.8 * (1 - t), Math.cos(clock.elapsedTime * 2) * 0.4 * (1 - t));
      if (progress.current >= 1) {
        setLanded(true);
        audio.sfx("paper", { volume: 0.5 });
      }
    } else {
      g.position.set(landing[0], groundY + 0.4 + Math.sin(clock.elapsedTime * 1.8) * 0.08, landing[2]);
      g.rotation.set(-0.35, clock.elapsedTime * 0.6, 0);
    }
  });

  return (
    <group ref={group} visible={false}>
      <group onClick={(e) => (e.stopPropagation(), triggerInteraction("first-envelope"))}>
        <mesh castShadow>
          <boxGeometry args={[0.9, 0.6, 0.05]} />
          <meshStandardMaterial color="#fff1f6" emissive="#ffb7d5" emissiveIntensity={0.35} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.12, 0.03]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial color="#ffd6e7" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.02, 0.06]}>
          <circleGeometry args={[0.08, 16]} />
          <meshStandardMaterial color="#ff6fa3" emissive="#ff6fa3" emissiveIntensity={0.8} />
        </mesh>
      </group>
      <pointLight color="#ffb7d5" intensity={2} distance={4} decay={2} />
      <Particles count={18} texture="spark" color="#ffd6e7" size={[0.05, 0.12]} area={[1, 1, 1]} center={[0, 0, 0]} velocity={[0, -0.3, 0]} jitter={0.2} twinkle={1.5} seed={21} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Decorative islets + clouds                                                */
/* -------------------------------------------------------------------------- */

function Islets() {
  const islets = useMemo(
    () => [
      { pos: [-34, -9, -18] as [number, number, number], r: 5, seed: 3 },
      { pos: [30, -14, -30] as [number, number, number], r: 7, seed: 4 },
      { pos: [-22, -20, 28] as [number, number, number], r: 4, seed: 5 },
      { pos: [40, -4, 14] as [number, number, number], r: 4.5, seed: 6 },
      { pos: [8, -30, -60] as [number, number, number], r: 9, seed: 7 },
    ],
    [],
  );
  const flat = useMemo(() => () => 0, []);
  return (
    <group>
      {islets.map((i) => (
        <group key={i.seed}>
          <FloatingIsland radius={i.r} getHeight={flat} depth={i.r * 1.6} seed={i.seed} position={i.pos} rings={8} receiveShadow={false} topColor="#3a6e52" />
          <Lantern position={[i.pos[0], i.pos[1], i.pos[2]]} color={LIGHT_COLORS[i.seed % 3]} height={1.4} />
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

export default function SkyIsland() {
  const sceneId = useProgressStore((s) => s.sceneId);
  const phase = useUIStore((s) => s.phase);
  const inventory = useProgressStore((s) => s.inventory);
  const { preset } = useQuality();
  const exploreDone = useRef(false);
  const portalBusy = useRef(false);
  const dir = useRef<THREE.DirectionalLight>(null);

  // Collision world
  useEffect(() => {
    setWorld({
      id: "sky-island",
      getHeight,
      isWalkable,
      colliders: [
        circle(SKY_ISLAND.tree[0], SKY_ISLAND.tree[2], 0.9),
        circle(SKY_ISLAND.portal[0] - 2.7, SKY_ISLAND.portal[2], 0.6),
        circle(SKY_ISLAND.portal[0] + 2.7, SKY_ISLAND.portal[2], 0.6),
        ...SKY_ISLAND.crystals.map((c) => circle(c[0], c[2], 0.8)),
      ],
      mode: "walk",
      respawn: SKY_ISLAND.spawn,
    });
    game.notifyEnvironmentReady("sky-island");
    return () => {
      game.notifyEnvironmentUnmounted("sky-island");
      setWorld(null);
    };
  }, []);

  // Portal hum while open
  useEffect(() => {
    if (sceneId !== "first-portal") return;
    audio.startLoop("portal-loop", 0.35, 1500);
    return () => audio.stopLoop("portal-loop", 800);
  }, [sceneId]);

  // Scene 02 — walk to the marker
  useFrame(() => {
    if (sceneId !== "strange-place" || exploreDone.current || phase !== "playing") return;
    const p = runtime.player.position;
    if (Math.hypot(p.x - SKY_ISLAND.marker[0], p.z - SKY_ISLAND.marker[2]) < 1.7) {
      exploreDone.current = true;
      audio.sfx("sparkle");
      game.advanceObjective("explore-island");
    }
  });

  // Portal entry (end of Scene 05)
  const portalPos = useMemo(() => new THREE.Vector3(SKY_ISLAND.portal[0], 1.2, SKY_ISLAND.portal[2]), []);
  useInteractable(
    sceneId === "first-portal"
      ? {
          id: "portal",
          position: portalPos,
          radius: 3.6,
          label: "Masuki portal",
          icon: "sparkles",
          priority: 10,
          enabled: true,
          onInteract: () => {
            if (portalBusy.current || fx.portalPower < 0.5) return;
            portalBusy.current = true;
            void enterPortal();
          },
        }
      : null,
  );

  const enterPortal = async () => {
    const p = SKY_ISLAND.portal;
    const player = runtime.player;
    useUIStore.getState().setHudHidden(true);
    audio.sfx("portal-enter", { volume: 0.9 });
    player.mode = "none";
    const start = player.position.clone();
    const end = new THREE.Vector3(p[0], 2.3, p[2]);
    const proxy = { t: 0 };
    await game.playCinematic(
      (tl, { rig }) => {
        setCamera(tl, rig, [p[0] - 5, 2.4, p[2] + 7], [p[0], 1.8, p[2]]);
        tl.to(
          proxy,
          {
            t: 1,
            duration: 2.4,
            ease: "power2.in",
            onUpdate: () => {
              player.position.lerpVectors(start, end, proxy.t);
              player.scale = 1 - proxy.t * 0.9;
              player.yaw = Math.PI;
              fx.portalEnter = proxy.t;
            },
          },
          0,
        );
        moveCamera(tl, rig, { position: [p[0], 2.3, p[2] + 2.5], target: [p[0], 2.3, p[2]], duration: 2.6, ease: "power2.in", fov: 70, at: 0.2 });
        hold(tl, 0.3);
      },
      { skippable: false },
    );
    player.visible = false;
    game.advanceObjective("enter-portal", { delay: 100 });
  };

  // Scene 03 — the letter
  const openFirstLetter = async () => {
    await game.openLetter(story.letters.firstMessage, { closable: false });
    game.collect("letter-first", { sfx: "paper" });
    await game.say(story.dialogue.afterFirstLetter);
    game.advanceObjective("read-first-message", { delay: 200 });
  };

  // Scatter decoration once
  const scatterData = useMemo(() => {
    const trees = scatter({ count: 14, seed: 101, area: inIsland, bounds: [-R, R, -R, R], scale: [0.7, 1.15], avoid, avoidRadius: 3.2 });
    const rocks = scatter({ count: 22, seed: 102, area: inIsland, bounds: [-R, R, -R, R], scale: [0.4, 1.1], avoid, avoidRadius: 2 });
    const grass = scatter({ count: 420, seed: 103, area: inIsland, bounds: [-R, R, -R, R], scale: [0.7, 1.4], avoid: [SKY_ISLAND.portal, SKY_ISLAND.marker], avoidRadius: 2.2 });
    const crystals = SKY_ISLAND.crystals.map((c, i) => ({ x: c[0], z: c[2], s: 1 + (i % 2) * 0.5, r: i * 1.3, tint: i / 4 }));
    return { trees, rocks, grass, crystals };
  }, []);

  const lightsCollected = SKY_ISLAND.lights.filter((_, i) => inventory.includes(`light-${i + 1}`)).length;
  const showLights = sceneId === "follow-the-light" || (sceneId === "first-portal" && lightsCollected < 3);
  const showEnvelope = sceneId === "first-message" && !inventory.includes("letter-first");

  useFrame(({ clock }) => {
    if (dir.current) dir.current.intensity = 0.9 + Math.sin(clock.elapsedTime * 0.3) * 0.08;
  });

  return (
    <group>
      <SkyDome palette={NIGHT_SKY} />
      <fog attach="fog" args={["#120c2c", 45, 160]} />
      <ambientLight color="#8d8ad6" intensity={0.55} />
      <hemisphereLight color="#8f7fe0" groundColor="#1a1430" intensity={0.6} />
      <directionalLight
        ref={dir}
        position={[-14, 22, -12]}
        color="#cfd4ff"
        intensity={0.9}
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
      />

      <FloatingIsland radius={R} getHeight={getHeight} seed={11} topColor="#3b7a58" cliffColor="#3a2f55" />
      <StoneDisc position={[0, getHeight(0, 4), 4]} radius={2.4} color="#6d6488" />
      <StoneDisc position={[SKY_ISLAND.marker[0], getHeight(SKY_ISLAND.marker[0], SKY_ISLAND.marker[2]), SKY_ISLAND.marker[2]]} radius={1.8} color="#6d6488" />
      <StoneDisc position={[SKY_ISLAND.portal[0], getHeight(SKY_ISLAND.portal[0], SKY_ISLAND.portal[2]) , SKY_ISLAND.portal[2] + 1.2]} radius={3.4} color="#574d78" />

      <Trees placements={scatterData.trees} getHeight={getHeight} leafColors={["#5a8fa8", "#6f7fc9", "#4f9a84"]} trunkColor="#4a3552" />
      <Rocks placements={scatterData.rocks} getHeight={getHeight} color="#4f4668" />
      <GrassTufts placements={scatterData.grass} getHeight={getHeight} color="#4f9a6d" />
      <Crystals placements={scatterData.crystals} getHeight={getHeight} color="#b9a7ff" />
      <CrystalTree position={SKY_ISLAND.tree} />

      {/* lanterns lining the way to the portal */}
      {[
        [-2.4, -2],
        [2.4, -2],
        [-2.8, -9.5],
        [2.8, -9.5],
      ].map(([x, z], i) => (
        <Lantern key={i} position={[x, getHeight(x, z), z]} color={i < 2 ? "#ffd27a" : "#ff9fc4"} light={i >= 2 && preset.shadows} />
      ))}

      <Portal position={[SKY_ISLAND.portal[0], getHeight(SKY_ISLAND.portal[0], SKY_ISLAND.portal[2]), SKY_ISLAND.portal[2]]} />
      <GlowMarker position={[SKY_ISLAND.marker[0], getHeight(SKY_ISLAND.marker[0], SKY_ISLAND.marker[2]), SKY_ISLAND.marker[2]]} active={sceneId === "strange-place"} />

      <FallingEnvelope active={showEnvelope} onOpen={openFirstLetter} />

      {showLights &&
        SKY_ISLAND.lights.map((pos, i) => (
          <Collectible
            key={i}
            id={`light-${i + 1}`}
            position={[pos[0], getHeight(pos[0], pos[2]), pos[2]]}
            label="Ambil cahaya"
            icon="light"
            color={LIGHT_COLORS[i]}
            onCollect={() => {
              if (!game.collect(`light-${i + 1}`, { sfx: "collect" })) return false;
              game.advanceObjective("collect-lights");
              return true;
            }}
          />
        ))}

      <Islets />

      {/* atmosphere */}
      <Particles count={160} texture="firefly" color={["#ffd27a", "#ff9fc4", "#b9a7ff"]} size={[0.08, 0.22]} area={[34, 10, 34]} center={[0, 3, 0]} velocity={[0.05, 0.12, 0.03]} jitter={0.4} sway={0.6} twinkle={1.6} seed={31} />
      <Particles count={70} texture="cloud" color="#8d79dd" size={[6, 14]} area={[120, 14, 120]} center={[0, -16, -10]} velocity={[0.35, 0, 0.1]} jitter={0.02} sway={0.2} twinkle={0.1} opacity={0.35} spin={0.05} seed={32} renderOrder={-1} />
      <Particles count={120} texture="star" color="#ffffff" size={[0.1, 0.3]} area={[160, 60, 160]} center={[0, 30, -20]} velocity={[0, 0, 0]} jitter={0} sway={0.1} twinkle={2.2} seed={33} />
    </group>
  );
}
