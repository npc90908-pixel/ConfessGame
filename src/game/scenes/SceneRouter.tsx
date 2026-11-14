"use client";

import { Suspense, lazy, type ComponentType } from "react";
import { useUIStore } from "@/store/uiStore";
import type { EnvironmentId } from "@/types/game";

/**
 * Lazily mounts exactly one environment at a time. Each chapter world is a
 * separate chunk, so the initial bundle never contains all 25 scenes.
 */
const environments: Record<EnvironmentId, ComponentType> = {
  "sky-island": lazy(() => import("./environments/SkyIsland")),
  "memory-garden": lazy(() => import("./environments/MemoryGarden")),
  ocean: lazy(() => import("./environments/OceanWorld")),
  castle: lazy(() => import("./environments/CastleWorld")),
  "final-garden": lazy(() => import("./environments/FinalGarden")),
};

/** Warm the chunk of the next chapter while the player explores the current one. */
export function prefetchEnvironment(id: EnvironmentId) {
  switch (id) {
    case "sky-island":
      void import("./environments/SkyIsland");
      break;
    case "memory-garden":
      void import("./environments/MemoryGarden");
      break;
    case "ocean":
      void import("./environments/OceanWorld");
      break;
    case "castle":
      void import("./environments/CastleWorld");
      break;
    case "final-garden":
      void import("./environments/FinalGarden");
      break;
  }
}

export function SceneRouter() {
  const env = useUIStore((s) => s.activeEnvironment);
  const key = useUIStore((s) => s.environmentKey);
  if (!env) return null;
  const Environment = environments[env];
  return (
    <Suspense fallback={null}>
      <Environment key={`${env}-${key}`} />
    </Suspense>
  );
}
