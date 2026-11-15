"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { story } from "@/config/story";
import { game } from "@/game/engine/GameManager";
import { runtime } from "@/game/engine/runtime";
import { KEEPSAKES } from "@/game/systems/items";
import { useProgressStore } from "@/store/progressStore";
import { useUIStore } from "@/store/uiStore";
import { Collectible } from "./Collectible";

/**
 * An optional keepsake hidden somewhere off the main path. Collecting it adds
 * the item to the inventory and plays its one-line note from the sender.
 */
export function Keepsake({ id, position }: { id: string; position: [number, number, number] }) {
  const def = KEEPSAKES.find((k) => k.id === id);
  if (!def) return null;
  return (
    <Collectible
      id={id}
      position={position}
      label="Ambil kenang-kenangan"
      icon="sparkles"
      shape="keepsake"
      color={def.color}
      hover={0.55}
      radius={2}
      onCollect={() => {
        if (!game.collect(id, { sfx: "sparkle", icon: "sparkles" })) return false;
        void game.say([{ speaker: story.senderName, text: def.line }]);
        return true;
      }}
    />
  );
}

/**
 * A quiet place that speaks once: the first time the player walks into the
 * radius while free to move, the lines play and a progress flag remembers it.
 */
export function MemorySpot({ id, position, radius = 3.2, lines }: { id: string; position: [number, number, number]; radius?: number; lines: Array<{ speaker?: string; text: string }> }) {
  const flag = `spot:${id}`;
  const seen = useProgressStore((s) => s.flags[flag] === true);
  const phase = useUIStore((s) => s.phase);
  const firing = useRef(false);
  useFrame(() => {
    if (seen || firing.current || phase !== "playing" || runtime.player.mode !== "walk") return;
    if (useUIStore.getState().dialogue) return;
    const p = runtime.player.position;
    if (Math.hypot(p.x - position[0], p.z - position[2]) > radius) return;
    firing.current = true;
    useProgressStore.getState().setFlag(flag);
    void game.say(lines);
  });
  return null;
}
