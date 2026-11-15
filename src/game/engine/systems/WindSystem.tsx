"use client";

import { useFrame } from "@react-three/fiber";
import { tickWind } from "@/game/systems/wind";

/** Advances the shared wind field once per frame (before the scene renders). */
export function WindSystem() {
  useFrame(({ clock }) => tickWind(clock.elapsedTime), -10);
  return null;
}
