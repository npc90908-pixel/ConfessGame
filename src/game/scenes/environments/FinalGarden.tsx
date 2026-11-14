"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { fx } from "@/game/engine/fx";
import { game } from "@/game/engine/GameManager";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { runtime } from "@/game/engine/runtime";
import { circle, setWorld } from "@/game/engine/world";
import { hold, moveCamera, setCamera } from "@/game/animations/camera";
import { HeartMesh } from "@/game/objects/Collectible";
import { FlowerField, GrassTufts, Lantern, Trees, scatter } from "@/game/objects/Flora";
import { GlowMarker } from "@/game/objects/GlowMarker";
import { Particles } from "@/game/objects/Particles";
import { SkyDome, type SkyPalette } from "@/game/objects/SkyDome";
import { FloatingIsland, GlowingPath, StoneDisc, makeRollingHeight } from "@/game/objects/Terrain";
import { ITEMS } from "@/game/systems/items";
import { audio } from "@/game/systems/audio/AudioManager";
import { useQuality } from "@/game/systems/quality";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { createRng, lerp } from "@/lib/math";
import { FINAL } from "../landmarks";
import type { SceneId } from "@/types/game";

const ISLANDS = FINAL.islands;
const BRIDGE_HW = 1.7;
const islandHeight = makeRollingHeight(55, 0.18, 0.2, [[FINAL.gift[0], FINAL.gift[2], 4]]);

function onIsland(x: number, z: number, margin = 0.8) {
  return ISLANDS.some((i) => Math.hypot(x - i.x, z - i.z) < i.r - margin);
}
function onBridge(x: number, z: number) {
  for (let i = 0; i < ISLANDS.length - 1; i++) {
    const a = ISLANDS[i];
    const b = ISLANDS[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const t = ((x - a.x) * dx + (z - a.z) * dz) / (len * len);
    if (t < 0 || t > 1) continue;
    const px = a.x + dx * t;
    const pz = a.z + dz * t;
    if (Math.hypot(x - px, z - pz) < BRIDGE_HW - 0.35) return true;
  }
  return false;
}
const isWalkable = (x: number, z: number) => onIsland(x, z) || onBridge(x, z);
const getHeight = (x: number, z: number) => (onIsland(x, z, 0) ? islandHeight(x, z) : 0.05);

const SKY: SkyPalette = {
  top: "#2a1a5a",
  horizon: "#ff9fb0",
  bottom: "#3a2a6a",
  nebulaA: "#7a4aa8",
  nebulaB: "#ffb7d5",
  nebula: 0.6,
  stars: 0.7,
  sun: 0.9,
  sunColor: "#ffd6a8",
  sunDir: [-0.4, 0.12, -0.9],
  sunSize: 0.06,
  moon: 0.3,
  moonDir: [0.6, 0.6, 0.5],
};

const SUMMARY_SCENES: SceneId[] = ["everything-we-found", "the-gift", "the-question", "new-beginning"];

/* -------------------------------------------------------------------------- */
/*  Orbiting collected items                                                  */
/* -------------------------------------------------------------------------- */

function OrbitingItems() {
  const inventory = useProgressStore((s) => s.inventory);
  const group = useRef<THREE.Group>(null);
  const items = useMemo(() => inventory.map((id) => ITEMS[id]).filter(Boolean).filter((i) => i.category !== "gift"), [inventory]);
  const params = useMemo(() => {
    const rng = createRng(606);
    return items.map((_, i) => ({ radius: 1.5 + (i % 4) * 0.35, height: 1 + rng.range(0, 1.2), speed: 0.35 + rng.range(0, 0.35), offset: (i / items.length) * Math.PI * 2, tilt: rng.range(-0.3, 0.3) }));
  }, [items]);
  const fade = useRef(0);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    fade.current = THREE.MathUtils.damp(fade.current, 1, 1, dt);
    const p = runtime.player.position;
    g.position.set(p.x, p.y, p.z);
    const t = clock.elapsedTime;
    g.children.forEach((child, i) => {
      const prm = params[i];
      if (!prm) return;
      const a = t * prm.speed + prm.offset;
      child.position.set(Math.cos(a) * prm.radius * fade.current, prm.height + Math.sin(a * 2 + prm.tilt) * 0.2, Math.sin(a) * prm.radius * fade.current);
      child.rotation.y = t * 1.2 + i;
    });
  });

  return (
    <group ref={group}>
      {items.map((item) => (
        <mesh key={item.id}>
          <octahedronGeometry args={[0.16, 0]} />
          <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={1.8} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Gift box                                                                  */
/* -------------------------------------------------------------------------- */

function GiftBox({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  const lid = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const g = FINAL.gift;
  const y = getHeight(g[0], g[2]);
  const pos = useMemo(() => new THREE.Vector3(g[0], y + 0.8, g[2]), [g, y]);
  const opened = useProgressStore((s) => s.inventory.includes("gift-heart"));
  const k = useRef(0);

  useInteractable(
    active && !opened
      ? {
          id: "gift-box",
          position: pos,
          radius: 3.2,
          label: "Buka hadiahnya",
          icon: "gift",
          priority: 10,
          onInteract: onOpen,
        }
      : null,
  );

  useFrame(({ clock }, dt) => {
    k.current = THREE.MathUtils.damp(k.current, fx.giftOpen, 2.2, dt);
    const o = k.current;
    const t = clock.elapsedTime;
    if (lid.current) {
      lid.current.rotation.x = -o * 1.9;
      lid.current.position.z = -0.55 - o * 0.25;
      lid.current.position.y = 1.1 + o * 0.2;
    }
    if (heart.current) {
      heart.current.position.y = 0.6 + o * 1.3 + Math.sin(t * 1.5) * 0.08 * o;
      heart.current.rotation.y = t * 0.8;
      const beat = 1 + Math.max(0, Math.sin(t * 4)) * 0.06 * o;
      heart.current.scale.setScalar(Math.max(0.001, o * 0.7 * beat));
    }
    if (light.current) light.current.intensity = o * (12 + Math.sin(t * 4) * 3) + 1;
  });

  return (
    <group position={[g[0], y, g[2]]} onClick={(e) => (e.stopPropagation(), triggerInteraction("gift-box"))}>
      <StoneDisc position={[0, 0, 0]} radius={2.4} color="#8a7fa8" height={0.25} />
      {/* box */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[1.1, 1.1, 1.1]} />
        <meshStandardMaterial color="#ff6fa3" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[1.12, 1.12, 0.22]} />
        <meshStandardMaterial color="#f3d08a" emissive="#f3d08a" emissiveIntensity={0.4} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.22, 1.12, 1.12]} />
        <meshStandardMaterial color="#f3d08a" emissive="#f3d08a" emissiveIntensity={0.4} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* lid (hinged at the back edge) */}
      <group ref={lid} position={[0, 1.1, -0.55]}>
        <mesh position={[0, 0.1, 0.55]} castShadow>
          <boxGeometry args={[1.2, 0.2, 1.2]} />
          <meshStandardMaterial color="#ff4f8a" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.22, 0.55]}>
          <boxGeometry args={[1.22, 0.1, 0.22]} />
          <meshStandardMaterial color="#f3d08a" emissive="#f3d08a" emissiveIntensity={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.22, 0.55]}>
          <boxGeometry args={[0.22, 0.1, 1.22]} />
          <meshStandardMaterial color="#f3d08a" emissive="#f3d08a" emissiveIntensity={0.4} metalness={0.3} />
        </mesh>
        {/* bow */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.22, 0.4, 0.55]} rotation={[0, 0, s * 0.6]}>
            <torusGeometry args={[0.16, 0.06, 8, 16]} />
            <meshStandardMaterial color="#f3d08a" emissive="#f3d08a" emissiveIntensity={0.5} metalness={0.3} />
          </mesh>
        ))}
      </group>
      {/* the heart inside */}
      <group ref={heart} position={[0, 0.6, 0]} scale={0.001}>
        <HeartMesh color="#ff4f8a" scale={0.9} emissiveIntensity={2.2} />
      </group>
      <pointLight ref={light} position={[0, 1.6, 0]} color="#ff8fb8" intensity={1} distance={16} decay={2} />
      <Particles count={60} texture="spark" color={["#ffd6e7", "#f3d08a"]} size={[0.04, 0.14]} area={[3, 3, 3]} center={[0, 1.6, 0]} velocity={[0, 0.5, 0]} jitter={0.3} twinkle={1.6} seed={610} getOpacity={() => Math.max(0.25, k.current)} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Fireworks (CPU particle bursts, pooled)                                   */
/* -------------------------------------------------------------------------- */

const FIREWORK_COLORS = ["#ff8fb8", "#f3d08a", "#b9a7ff", "#8fd3ff", "#ffffff", "#ff6fa3"];

function Fireworks({ bursts = 6, perBurst = 90 }: { bursts?: number; perBurst?: number }) {
  const points = useRef<THREE.Points>(null);
  const rng = useMemo(() => createRng(707), []);
  const data = useMemo(() => {
    const positions = new Float32Array(bursts * perBurst * 3);
    const colors = new Float32Array(bursts * perBurst * 3);
    const velocities = new Float32Array(bursts * perBurst * 3);
    const state = Array.from({ length: bursts }, (_, i) => ({ age: -i * 0.5, life: 2.2, origin: new THREE.Vector3(), color: new THREE.Color() }));
    return { positions, colors, velocities, state };
  }, [bursts, perBurst]);
  const lastSound = useRef(0);

  const spawn = (b: number) => {
    const s = data.state[b];
    s.origin.set(FINAL.gift[0] + rng.range(-18, 18), 10 + rng.range(0, 10), FINAL.gift[2] + rng.range(-16, 8));
    s.color.set(FIREWORK_COLORS[rng.int(0, FIREWORK_COLORS.length - 1)]);
    s.age = 0;
    s.life = 1.8 + rng.range(0, 0.9);
    const speed = 5 + rng.range(0, 3);
    for (let i = 0; i < perBurst; i++) {
      const idx = (b * perBurst + i) * 3;
      const u = rng.range(-1, 1);
      const phi = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(1 - u * u);
      const sp = speed * (0.7 + rng.range(0, 0.3));
      data.velocities[idx] = r * Math.cos(phi) * sp;
      data.velocities[idx + 1] = u * sp;
      data.velocities[idx + 2] = r * Math.sin(phi) * sp;
      data.positions[idx] = s.origin.x;
      data.positions[idx + 1] = s.origin.y;
      data.positions[idx + 2] = s.origin.z;
      data.colors[idx] = s.color.r;
      data.colors[idx + 1] = s.color.g;
      data.colors[idx + 2] = s.color.b;
    }
  };

  useFrame(({ clock }, dt) => {
    const mesh = points.current;
    if (!mesh) return;
    const active = fx.celebration > 0.3;
    mesh.visible = active;
    if (!active) return;
    for (let b = 0; b < bursts; b++) {
      const s = data.state[b];
      s.age += dt;
      if (s.age > s.life) {
        spawn(b);
        if (clock.elapsedTime - lastSound.current > 0.9) {
          lastSound.current = clock.elapsedTime;
          audio.sfx("firework", { volume: 0.35, rate: 0.85 + rng.range(0, 0.3) });
        }
        continue;
      }
      if (s.age < 0) continue;
      const fade = 1 - s.age / s.life;
      for (let i = 0; i < perBurst; i++) {
        const idx = (b * perBurst + i) * 3;
        data.velocities[idx + 1] -= 4.5 * dt;
        data.velocities[idx] *= 1 - dt * 0.9;
        data.velocities[idx + 2] *= 1 - dt * 0.9;
        data.positions[idx] += data.velocities[idx] * dt;
        data.positions[idx + 1] += data.velocities[idx + 1] * dt;
        data.positions[idx + 2] += data.velocities[idx + 2] * dt;
        data.colors[idx] = s.color.r * fade;
        data.colors[idx + 1] = s.color.g * fade;
        data.colors[idx + 2] = s.color.b * fade;
      }
    }
    const geo = mesh.geometry;
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  });

  return (
    <points ref={points} visible={false} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.28} vertexColors transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/*  Environment                                                               */
/* -------------------------------------------------------------------------- */

export default function FinalGarden() {
  const sceneId = useProgressStore((s) => s.sceneId);
  const phase = useUIStore((s) => s.phase);
  const objectiveProgress = useProgressStore((s) => s.objectiveProgress["follow-path"] ?? 0);
  const { preset } = useQuality();
  const giftBusy = useRef(false);
  const warm = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  const fog = useRef<THREE.Fog>(null);
  const skyU = useRef<Record<string, THREE.IUniform> | null>(null);

  useEffect(() => {
    setWorld({
      id: "final-garden",
      getHeight,
      isWalkable,
      colliders: [circle(FINAL.gift[0], FINAL.gift[2], 1.1)],
      mode: "walk",
      respawn: FINAL.spawn,
    });
    const progress = useProgressStore.getState();
    fx.giftOpen = progress.inventory.includes("gift-heart") ? 1 : 0;
    fx.celebration = progress.answer === "yes" && progress.sceneId === "new-beginning" ? 1 : 0;
    fx.questionMood = progress.answer ? 0.6 : 0;
    game.notifyEnvironmentReady("final-garden");
    return () => {
      game.notifyEnvironmentUnmounted("final-garden");
      setWorld(null);
    };
  }, []);

  // Scene 21 — waypoints along the glowing path (in order)
  useFrame(() => {
    if (sceneId !== "final-path" || phase !== "playing") return;
    const next = FINAL.waypoints[objectiveProgress];
    if (!next) return;
    const p = runtime.player.position;
    if (Math.hypot(p.x - next[0], p.z - next[2]) < 2.2) {
      audio.sfx("sparkle");
      game.advanceObjective("follow-path");
    }
  });

  // Scene 23 — open the gift
  const openGift = async () => {
    if (giftBusy.current) return;
    giftBusy.current = true;
    const g = FINAL.gift;
    useUIStore.getState().setHudHidden(true);
    await game.playCinematic(
      (tl, { rig }) => {
        setCamera(tl, rig, [g[0] + 3, 1.8, g[2] + 4], [g[0], 1, g[2]]);
        tl.call(() => audio.sfx("gift-open", { volume: 0.9 }), [], 0.5);
        tl.to(fx, { giftOpen: 1, duration: 3, ease: "power2.inOut" }, 0.5);
        moveCamera(tl, rig, { position: [g[0] - 1.5, 2.2, g[2] + 3.6], target: [g[0], 1.6, g[2]], duration: 4, at: 0.3 });
        tl.call(() => audio.sfx("sparkle", { volume: 0.8 }), [], 2.8);
        hold(tl, 0.8);
      },
      { skippable: false },
    );
    game.collect("gift-heart", { sfx: "collect" });
    useUIStore.getState().setHudHidden(false);
    game.advanceObjective("open-gift", { delay: 300 });
  };

  // Mood: warm lights for the question, brighter for the celebration.
  useFrame((_, dt) => {
    const q = fx.questionMood;
    const c = fx.celebration;
    if (warm.current) warm.current.intensity = lerp(1.0, 1.6, q) + c * 0.4;
    if (ambient.current) ambient.current.intensity = lerp(0.6, 0.85, q) + c * 0.2;
    if (fog.current) fog.current.color.lerp(new THREE.Color(c > 0.5 ? "#6a3a7a" : q > 0.5 ? "#5a3a6a" : "#4a3a7a"), THREE.MathUtils.damp(0, 1, 1, dt));
    const u = skyU.current;
    if (u) {
      u.uSun.value = 0.9 + q * 0.4;
      u.uNebula.value = 0.6 + c * 0.4;
      u.uStars.value = 0.7 + c * 0.6;
    }
  });

  const scatterData = useMemo(() => {
    const area = (x: number, z: number) => onIsland(x, z, 1.4) && Math.hypot(x - FINAL.gift[0], z - FINAL.gift[2]) > 3.5;
    const trees = scatter({ count: 12, seed: 501, area, bounds: [-16, 16, -38, 38], scale: [0.7, 1.1], avoid: [FINAL.spawn, FINAL.gift, ...FINAL.waypoints], avoidRadius: 3 });
    const grass = scatter({ count: 380, seed: 502, area, bounds: [-16, 16, -38, 38], scale: [0.6, 1.2], avoid: [FINAL.gift], avoidRadius: 3 });
    const flowers = scatter({ count: 260, seed: 503, area, bounds: [-16, 16, -38, 38], scale: [0.7, 1.2], avoid: [FINAL.gift], avoidRadius: 3 });
    return { trees, grass, flowers };
  }, []);

  const pathPoints = useMemo<Array<[number, number, number]>>(() => [FINAL.spawn, ...FINAL.waypoints, FINAL.gift], []);
  const showOrbit = SUMMARY_SCENES.includes(sceneId);

  return (
    <group>
      <SkyDome
        palette={SKY}
        onFrame={(u) => {
          skyU.current = u;
        }}
      />
      <fog ref={fog} attach="fog" args={["#4a3a7a", 40, 150]} />
      <ambientLight ref={ambient} color="#ffd6e7" intensity={0.6} />
      <hemisphereLight color="#ffb7d5" groundColor="#2a1a4a" intensity={0.6} />
      <directionalLight
        ref={warm}
        position={[-20, 18, -30]}
        color="#ffd6a8"
        intensity={1}
        castShadow={preset.shadows}
        shadow-mapSize={[preset.shadowMapSize, preset.shadowMapSize]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-bias={-0.0004}
      />

      {ISLANDS.map((i, idx) => (
        <FloatingIsland key={idx} radius={i.r} getHeight={(x, z) => islandHeight(x + i.x, z + i.z)} position={[i.x, 0, i.z]} depth={i.r * 1.5} seed={60 + idx} topColor="#4f8f6a" cliffColor="#4a3a6a" rings={24} />
      ))}
      {/* bridges */}
      {ISLANDS.slice(0, -1).map((a, i) => {
        const b = ISLANDS[i + 1];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        const angle = Math.atan2(b.x - a.x, b.z - a.z);
        return (
          <group key={i} position={[(a.x + b.x) / 2, 0, (a.z + b.z) / 2]} rotation={[0, angle, 0]}>
            <mesh position={[0, -0.12, 0]} receiveShadow castShadow>
              <boxGeometry args={[BRIDGE_HW * 2, 0.3, len]} />
              <meshStandardMaterial color="#8a7fa8" roughness={0.9} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * (BRIDGE_HW - 0.1), 0.1, 0]}>
                <boxGeometry args={[0.14, 0.12, len]} />
                <meshStandardMaterial color="#ffd6e7" emissive="#ff9fc4" emissiveIntensity={1.6} />
              </mesh>
            ))}
          </group>
        );
      })}
      <GlowingPath points={pathPoints} getHeight={getHeight} color="#ffd6e7" intensity={1.3} />

      <Trees placements={scatterData.trees} getHeight={getHeight} leafColors={["#ffb7d5", "#ff9fc4", "#ffd6e7"]} trunkColor="#5a4068" />
      <GrassTufts placements={scatterData.grass} getHeight={getHeight} color="#6fb58a" />
      <FlowerField placements={scatterData.flowers} getHeight={getHeight} colors={["#ffffff", "#ffd6e7", "#f3d08a", "#ff8fb8"]} />

      {FINAL.waypoints.map((w, i) => (
        <GlowMarker key={i} position={[w[0], getHeight(w[0], w[2]), w[2]]} active={sceneId === "final-path" && objectiveProgress === i} color="#ffd6e7" />
      ))}
      {FINAL.waypoints.map((w, i) => (
        <Lantern key={`l-${i}`} position={[w[0] + 2.2, getHeight(w[0] + 2.2, w[2]), w[2]]} color="#ffd6e7" light={preset.shadows && i === 1} />
      ))}
      <GlowMarker position={[FINAL.gift[0], getHeight(FINAL.gift[0], FINAL.gift[2]), FINAL.gift[2] + 3]} active={sceneId === "the-gift"} color="#ff8fb8" radius={1.6} beam={false} />

      <GiftBox active={sceneId === "the-gift"} onOpen={() => void openGift()} />
      {showOrbit && <OrbitingItems />}
      <Fireworks />

      {/* clouds below and petals above */}
      <Particles count={140} texture="cloud" color={["#ffd6e7", "#ffffff"]} size={[8, 20]} area={[160, 10, 160]} center={[0, -9, -5]} velocity={[0.5, 0, 0.1]} jitter={0.02} sway={0.2} twinkle={0.05} opacity={0.6} spin={0.03} seed={620} renderOrder={-1} additive={false} />
      <Particles count={200} texture="petal" color={["#ff9fc4", "#ffd6e7", "#f3d08a"]} size={[0.1, 0.26]} area={[60, 14, 80]} center={[0, 6, -5]} velocity={[0.5, -0.35, 0.1]} jitter={0.5} sway={1} spin={1.5} twinkle={0.2} additive={false} seed={621} getOpacity={() => 0.5 + fx.celebration * 0.5} />
      <Particles count={140} texture="glow" color={["#fff1c9", "#ffd6e7"]} size={[0.06, 0.18]} area={[50, 8, 80]} center={[0, 2, -5]} velocity={[0.05, 0.15, 0.05]} jitter={0.4} sway={0.6} twinkle={1.8} seed={622} />
    </group>
  );
}
