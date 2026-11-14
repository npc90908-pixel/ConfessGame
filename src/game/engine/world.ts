import type { EnvironmentId } from "@/types/game";

/**
 * Lightweight collision world. Each environment registers one of these on
 * mount; the controllers query it every frame.
 */

export type Collider =
  | { type: "circle"; x: number; z: number; r: number }
  | { type: "box"; x: number; z: number; hw: number; hd: number; rotation?: number };

export interface WorldDefinition {
  id: EnvironmentId;
  /** Ground height at (x, z). Return the value used to place the player's feet. */
  getHeight: (x: number, z: number) => number;
  /** True when (x, z) is inside the walkable region. */
  isWalkable: (x: number, z: number) => boolean;
  colliders: Collider[];
  /** For boat environments, the controller switches to vehicle mode. */
  mode: "walk" | "boat";
  /** Point to send the player if they somehow end up outside the world. */
  respawn: [number, number, number];
}

let current: WorldDefinition | null = null;
const listeners = new Set<(world: WorldDefinition | null) => void>();

export function setWorld(world: WorldDefinition | null) {
  current = world;
  for (const l of listeners) l(world);
}

export function getWorld(): WorldDefinition | null {
  return current;
}

export function onWorldChange(listener: (world: WorldDefinition | null) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* -------------------------------------------------------------------------- */
/*  Collision helpers                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Push a circle of radius `r` at (x, z) out of all colliders. Mutates and
 * returns `out`. Simple, stable and plenty for a stylised adventure.
 */
export function resolveColliders(
  x: number,
  z: number,
  r: number,
  colliders: Collider[],
  out: { x: number; z: number },
) {
  let px = x;
  let pz = z;
  for (const c of colliders) {
    if (c.type === "circle") {
      const dx = px - c.x;
      const dz = pz - c.z;
      const dist = Math.hypot(dx, dz);
      const min = c.r + r;
      if (dist < min) {
        if (dist < 1e-4) {
          px += min;
        } else {
          const push = (min - dist) / dist;
          px += dx * push;
          pz += dz * push;
        }
      }
    } else {
      // Transform into box local space
      const rot = c.rotation ?? 0;
      const cos = Math.cos(-rot);
      const sin = Math.sin(-rot);
      const lx = (px - c.x) * cos - (pz - c.z) * sin;
      const lz = (px - c.x) * sin + (pz - c.z) * cos;
      const cx = Math.max(-c.hw, Math.min(c.hw, lx));
      const cz = Math.max(-c.hd, Math.min(c.hd, lz));
      const dx = lx - cx;
      const dz = lz - cz;
      const dist = Math.hypot(dx, dz);
      if (dist < r) {
        let nx: number;
        let nz: number;
        if (dist < 1e-4) {
          // Inside the box — push out along the nearest face.
          const toRight = c.hw - lx;
          const toLeft = lx + c.hw;
          const toFront = c.hd - lz;
          const toBack = lz + c.hd;
          const m = Math.min(toRight, toLeft, toFront, toBack);
          nx = m === toRight ? 1 : m === toLeft ? -1 : 0;
          nz = m === toFront ? 1 : m === toBack ? -1 : 0;
          const push = m + r;
          const wx = nx * push;
          const wz = nz * push;
          const cosB = Math.cos(rot);
          const sinB = Math.sin(rot);
          px += wx * cosB - wz * sinB;
          pz += wx * sinB + wz * cosB;
        } else {
          nx = dx / dist;
          nz = dz / dist;
          const push = r - dist;
          const wx = nx * push;
          const wz = nz * push;
          const cosB = Math.cos(rot);
          const sinB = Math.sin(rot);
          px += wx * cosB - wz * sinB;
          pz += wx * sinB + wz * cosB;
        }
      }
    }
  }
  out.x = px;
  out.z = pz;
  return out;
}

/** Binary search back toward `from` until the point is walkable. */
export function clampToWalkable(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  isWalkable: (x: number, z: number) => boolean,
  out: { x: number; z: number },
) {
  if (isWalkable(toX, toZ)) {
    out.x = toX;
    out.z = toZ;
    return out;
  }
  // Try sliding along each axis before giving up.
  if (isWalkable(toX, fromZ)) {
    out.x = toX;
    out.z = fromZ;
    return out;
  }
  if (isWalkable(fromX, toZ)) {
    out.x = fromX;
    out.z = toZ;
    return out;
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2;
    const mx = fromX + (toX - fromX) * mid;
    const mz = fromZ + (toZ - fromZ) * mid;
    if (isWalkable(mx, mz)) lo = mid;
    else hi = mid;
  }
  out.x = fromX + (toX - fromX) * lo;
  out.z = fromZ + (toZ - fromZ) * lo;
  return out;
}

/** Convenience builders. */
export const circle = (x: number, z: number, r: number): Collider => ({ type: "circle", x, z, r });
export const box = (x: number, z: number, hw: number, hd: number, rotation = 0): Collider => ({
  type: "box",
  x,
  z,
  hw,
  hd,
  rotation,
});
