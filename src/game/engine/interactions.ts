"use client";

import { useEffect, useRef } from "react";
import { Vector3 } from "three";
import { useUIStore } from "@/store/uiStore";
import type { IconName } from "@/types/game";
import { runtime } from "./runtime";

/**
 * Interaction registry. Objects register a position + radius + callback;
 * the InteractionSystem (R3F) finds the closest enabled one each frame and
 * exposes it as the HUD prompt. Triggering works from keyboard (E), the
 * mobile button, or clicking/tapping the object itself.
 */

export interface Interactable {
  id: string;
  /** World position, or a getter for moving objects. */
  position: Vector3 | (() => Vector3);
  radius: number;
  label: string;
  icon?: IconName;
  enabled?: boolean;
  /** Higher wins when several are in range. */
  priority?: number;
  onInteract: () => void;
}

const registry = new Map<string, Interactable>();
let activeId: string | null = null;
const tmp = new Vector3();

export function registerInteractable(def: Interactable) {
  registry.set(def.id, { enabled: true, priority: 0, ...def });
  return () => {
    registry.delete(def.id);
    if (activeId === def.id) {
      activeId = null;
      useUIStore.getState().setPrompt(null);
    }
  };
}

export function updateInteractable(id: string, patch: Partial<Interactable>) {
  const def = registry.get(id);
  if (def) Object.assign(def, patch);
}

export function getInteractablePosition(def: Interactable): Vector3 {
  return typeof def.position === "function" ? def.position() : def.position;
}

/** Called once per frame by the InteractionSystem. */
export function updateInteractions(locked: boolean) {
  if (locked) {
    if (activeId !== null) {
      activeId = null;
      useUIStore.getState().setPrompt(null);
    }
    return;
  }
  const playerPos = runtime.player.position;
  let best: Interactable | null = null;
  let bestScore = Infinity;
  for (const def of registry.values()) {
    if (def.enabled === false) continue;
    const pos = getInteractablePosition(def);
    tmp.copy(pos).sub(playerPos);
    const dist = Math.hypot(tmp.x, tmp.z);
    if (dist > def.radius) continue;
    const score = dist - (def.priority ?? 0) * 100;
    if (score < bestScore) {
      bestScore = score;
      best = def;
    }
  }
  const nextId = best?.id ?? null;
  if (nextId !== activeId) {
    activeId = nextId;
    useUIStore.getState().setPrompt(best ? { id: best.id, label: best.label, icon: best.icon } : null);
  } else if (best) {
    // Label may have changed (e.g. after collecting a key).
    const prompt = useUIStore.getState().prompt;
    if (prompt && prompt.label !== best.label) {
      useUIStore.getState().setPrompt({ id: best.id, label: best.label, icon: best.icon });
    }
  }
}

/** Trigger the currently highlighted interactable (keyboard / mobile button). */
export function triggerActiveInteraction(): boolean {
  if (!activeId) return false;
  const def = registry.get(activeId);
  if (!def || def.enabled === false) return false;
  def.onInteract();
  return true;
}

/**
 * Trigger a specific interactable by id — used by click/tap on the object.
 * Allows a slightly wider radius than the proximity prompt so taps feel generous.
 */
export function triggerInteraction(id: string, maxDistanceMultiplier = 1.6): boolean {
  const def = registry.get(id);
  if (!def || def.enabled === false) return false;
  const pos = getInteractablePosition(def);
  const dist = Math.hypot(pos.x - runtime.player.position.x, pos.z - runtime.player.position.z);
  if (dist > def.radius * maxDistanceMultiplier) return false;
  def.onInteract();
  return true;
}

export function clearInteractables() {
  registry.clear();
  activeId = null;
  useUIStore.getState().setPrompt(null);
}

export function getActiveInteractableId() {
  return activeId;
}

/** React hook: register an interactable for the component's lifetime. */
export function useInteractable(def: Interactable | null) {
  const defRef = useRef(def);
  useEffect(() => {
    defRef.current = def;
  });
  const id = def?.id;
  const enabled = def?.enabled ?? true;
  const label = def?.label;
  const radius = def?.radius;
  const priority = def?.priority;

  useEffect(() => {
    const current = defRef.current;
    if (!current) return;
    return registerInteractable({
      ...current,
      // Always call the latest callback so stale closures are harmless.
      onInteract: () => defRef.current?.onInteract(),
      position: () => {
        const p = defRef.current?.position;
        return p ? (typeof p === "function" ? p() : p) : new Vector3();
      },
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;
    updateInteractable(id, { enabled, label, radius, priority });
  }, [id, enabled, label, radius, priority]);
}
