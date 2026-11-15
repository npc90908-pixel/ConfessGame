"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { triggerInteraction, useInteractable } from "@/game/engine/interactions";
import { useProgressStore } from "@/store/progressStore";
import type { IconName } from "@/types/game";
import { MODELS } from "@/config/models";
import { Model } from "./Model";
import { Particles } from "./Particles";

export type CollectibleShape = "orb" | "flower" | "key" | "bottle" | "star" | "heart" | "keepsake";

export interface CollectibleProps {
  id: string;
  position: [number, number, number];
  label: string;
  shape?: CollectibleShape;
  color?: string;
  icon?: IconName;
  radius?: number;
  /** Float height above `position`. */
  hover?: number;
  enabled?: boolean;
  /** Called when the player collects it. Return false to refuse. */
  onCollect: () => boolean | void;
  scale?: number;
  light?: boolean;
}

/**
 * Generic world pickup: a glowing object that bobs, spins and sparkles,
 * registers itself with the interaction system and disappears once the id is
 * in the inventory. Click/tap also works when close enough.
 */
export function Collectible({
  id,
  position,
  label,
  shape = "orb",
  color = "#f3d08a",
  icon,
  radius = 2.2,
  hover = 1.1,
  enabled = true,
  onCollect,
  scale = 1,
  light = true,
}: CollectibleProps) {
  const collected = useProgressStore((s) => s.inventory.includes(id));
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const [vanishing, setVanishing] = useState(false);
  const pos = useMemo(() => new THREE.Vector3(position[0], position[1] + hover, position[2]), [position, hover]);
  const phase = useMemo(() => (position[0] * 3.1 + position[2] * 1.7) % 6.28, [position]);

  useInteractable(
    collected || !enabled
      ? null
      : {
          id,
          position: pos,
          radius,
          label,
          icon: icon ?? "sparkles",
          onInteract: () => {
            const ok = onCollect();
            if (ok !== false) setVanishing(true);
          },
        },
  );

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime + phase;
    g.position.y = pos.y + Math.sin(t * 1.6) * 0.14;
    if (inner.current) {
      inner.current.rotation.y = t * 0.9;
      inner.current.rotation.z = Math.sin(t * 0.7) * 0.15;
    }
    const target = vanishing || collected ? 0 : scale;
    const s = THREE.MathUtils.damp(g.scale.x, target, vanishing ? 10 : 5, dt);
    g.scale.setScalar(Math.max(0.0001, s));
    g.visible = s > 0.01;
  });

  if (collected && !vanishing) return null;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    triggerInteraction(id);
  };

  return (
    <group ref={group} position={[pos.x, pos.y, pos.z]}>
      <group ref={inner} onClick={onClick} onPointerDown={(e) => e.stopPropagation()}>
        <Shape shape={shape} color={color} />
      </group>
      {light && <pointLight color={color} intensity={2.5} distance={5} decay={2} />}
      <Particles count={14} texture="spark" color={color} size={[0.05, 0.14]} area={[1.2, 1.2, 1.2]} center={[0, 0, 0]} velocity={[0, 0.25, 0]} jitter={0.15} sway={0.1} twinkle={1.5} seed={Math.abs(Math.round(phase * 100)) + 1} />
    </group>
  );
}

function Shape({ shape, color }: { shape: CollectibleShape; color: string }) {
  switch (shape) {
    case "flower":
      return (
        <group>
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={i} rotation={[0, (i / 6) * Math.PI * 2, 0]} position={[0, 0, 0]}>
              <sphereGeometry args={[0.16, 10, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.5} />
              <mesh position={[0.2, 0, 0]} scale={[1.6, 0.5, 1]}>
                <sphereGeometry args={[0.16, 10, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.5} />
              </mesh>
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.13, 12, 10]} />
            <meshStandardMaterial color="#fff2b0" emissive="#ffd978" emissiveIntensity={1.5} />
          </mesh>
        </group>
      );
    case "key":
      return (
        <group rotation={[0.35, 0, Math.PI / 5]}>
          <Model url={MODELS.platKey} scale={1.7} position={[0, -0.18, 0]} overrides={{ colormap: { color, emissive: color, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.4 } }} castShadow={false} receiveShadow={false} />
        </group>
      );
    case "bottle":
      return (
        <group rotation={[0.3, 0, 0.5]}>
          <Model url={MODELS.pirateBottle} scale={0.9} position={[0, -0.4, 0]} overrides={{ colormap: { emissive: "#9ad7ff", emissiveIntensity: 0.25, roughness: 0.2 } }} castShadow={false} receiveShadow={false} />
          <mesh position={[0, 0, 0]} rotation={[0, 0, 0.2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.36, 8]} />
            <meshStandardMaterial color="#fff4dc" emissive="#ffe6b0" emissiveIntensity={0.6} roughness={0.9} />
          </mesh>
        </group>
      );
    case "star":
      return <Model url={MODELS.platStar} scale={1.6} position={[0, -0.28, 0]} overrides={{ colormap: { color, emissive: color, emissiveIntensity: 1.1, roughness: 0.3 } }} castShadow={false} receiveShadow={false} />;
    case "heart":
      return <Model url={MODELS.platHeart} scale={0.75} position={[0, -0.25, 0]} overrides={{ colormap: { color, emissive: color, emissiveIntensity: 0.9, roughness: 0.25 } }} castShadow={false} receiveShadow={false} />;
    case "keepsake":
      return (
        <group rotation={[0.2, 0.6, 0.1]}>
          <Model url={MODELS.holidayPresentBRound} scale={1.1} position={[0, -0.18, 0]} overrides={{ colormap: { emissive: color, emissiveIntensity: 0.35, roughness: 0.5 } }} castShadow={false} receiveShadow={false} />
        </group>
      );
    case "orb":
    default:
      return (
        <group>
          <mesh>
            <sphereGeometry args={[0.22, 20, 16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} roughness={0.2} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.34, 16, 12]} />
            <meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      );
  }
}

/** Extruded heart used by collectibles, the crystal heart and the gift. */
export function HeartMesh({ color, scale = 1, emissiveIntensity = 1.2, ...rest }: { color: string; scale?: number; emissiveIntensity?: number } & Omit<React.ComponentProps<"mesh">, "scale">) {
  const geometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -1);
    s.bezierCurveTo(-0.1, -0.7, -1.2, -0.1, -1.2, 0.5);
    s.bezierCurveTo(-1.2, 1.1, -0.6, 1.3, -0.3, 1.1);
    s.bezierCurveTo(-0.1, 1, 0, 0.8, 0, 0.7);
    s.bezierCurveTo(0, 0.8, 0.1, 1, 0.3, 1.1);
    s.bezierCurveTo(0.6, 1.3, 1.2, 1.1, 1.2, 0.5);
    s.bezierCurveTo(1.2, -0.1, 0.1, -0.7, 0, -1);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.18, bevelSegments: 4, curveSegments: 18 });
    g.center();
    return g;
  }, []);
  return (
    <mesh geometry={geometry} scale={scale} {...rest}>
      <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} roughness={0.15} metalness={0.1} clearcoat={1} clearcoatRoughness={0.1} />
    </mesh>
  );
}
