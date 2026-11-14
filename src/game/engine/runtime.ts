import { Vector3 } from "three";
import { CONTROLS } from "@/config/controls";

/**
 * Mutable, frame-rate hot state shared between the R3F systems and the
 * GameManager. Nothing here is React state on purpose: it changes 60× per
 * second. React only reads snapshots when it needs to (HUD, save).
 */

export type ControlMode = "walk" | "boat" | "none";

export interface PlayerRuntime {
  position: Vector3;
  velocity: Vector3;
  /** Facing direction (radians around Y). */
  yaw: number;
  grounded: boolean;
  /** Planar speed in units/second — drives the walk animation. */
  speed: number;
  moving: boolean;
  running: boolean;
  jumpTime: number;
  mode: ControlMode;
  /** Visible character scale multiplier (used for portal shrink etc.). */
  scale: number;
  visible: boolean;
  /** Boat-specific. */
  boat: {
    speed: number;
    turnRate: number;
    heading: number;
    throttle: number;
  };
}

export type CameraMode = "follow" | "cinematic" | "title" | "boat";

export class CameraRig {
  mode: CameraMode = "title";
  yaw = 0;
  pitch: number = CONTROLS.camera.pitch;
  distance: number = CONTROLS.camera.distance;
  fov: number = CONTROLS.camera.fov;
  /** Where the camera actually is / looks after smoothing. */
  position = new Vector3(0, 3, 8);
  target = new Vector3(0, 1, 0);
  /** Desired values when mode === 'cinematic' (tweened by GSAP). */
  cinematicPosition = new Vector3(0, 3, 8);
  cinematicTarget = new Vector3(0, 1, 0);
  cinematicFov: number = CONTROLS.camera.fov;
  /** Blend factor 0..1 from follow → cinematic. */
  cinematicBlend = 0;
  shake = 0;
  /** Extra offset applied to the follow target (e.g. look slightly ahead). */
  lookAhead = 0;

  /** Snap the follow camera behind the player instantly (used on spawn). */
  snapBehind(playerPos: Vector3, playerYaw: number, distance = CONTROLS.camera.distance) {
    this.yaw = playerYaw + Math.PI;
    this.pitch = CONTROLS.camera.pitch;
    this.distance = distance;
    const x = playerPos.x + Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const z = playerPos.z + Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    const y = playerPos.y + CONTROLS.camera.height + Math.sin(this.pitch) * this.distance;
    this.position.set(x, y, z);
    this.target.copy(playerPos).y += CONTROLS.camera.height;
  }
}

export interface Runtime {
  player: PlayerRuntime;
  camera: CameraRig;
  /** Total elapsed game time in seconds (paused during overlays). */
  time: number;
  /** Realtime seconds since start (never pauses). */
  clock: number;
  /** Most recently mounted environment id. */
  environmentReady: string | null;
}

export const runtime: Runtime = {
  player: {
    position: new Vector3(0, 0, 0),
    velocity: new Vector3(),
    yaw: 0,
    grounded: true,
    speed: 0,
    moving: false,
    running: false,
    jumpTime: -10,
    mode: "walk",
    scale: 1,
    visible: true,
    boat: { speed: 0, turnRate: 0, heading: 0, throttle: 0 },
  },
  camera: new CameraRig(),
  time: 0,
  clock: 0,
  environmentReady: null,
};

/** Teleport the player and snap the camera behind them. */
export function spawnPlayer(position: [number, number, number], yaw: number) {
  const p = runtime.player;
  p.position.set(position[0], position[1], position[2]);
  p.velocity.set(0, 0, 0);
  p.yaw = yaw;
  p.speed = 0;
  p.moving = false;
  p.grounded = true;
  p.scale = 1;
  p.visible = true;
  p.boat.speed = 0;
  p.boat.heading = yaw;
  p.boat.throttle = 0;
  runtime.camera.snapBehind(p.position, yaw);
}
