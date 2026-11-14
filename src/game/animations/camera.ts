import type gsap from "gsap";
import { Vector3 } from "three";
import type { CameraRig } from "@/game/engine/runtime";
import type { Vec3 } from "@/game/scenes/landmarks";

const v = (p: Vec3 | Vector3) => (p instanceof Vector3 ? p : new Vector3(p[0], p[1], p[2]));

export interface MoveOptions {
  position: Vec3 | Vector3;
  target: Vec3 | Vector3;
  duration?: number;
  at?: number | string;
  ease?: string;
  fov?: number;
}

/** Tween the cinematic camera to a new position / look target. */
export function moveCamera(tl: gsap.core.Timeline, rig: CameraRig, opts: MoveOptions) {
  const pos = v(opts.position);
  const tgt = v(opts.target);
  const duration = opts.duration ?? 3;
  const ease = opts.ease ?? "power2.inOut";
  const at = opts.at ?? ">";
  tl.to(rig.cinematicPosition, { x: pos.x, y: pos.y, z: pos.z, duration, ease }, at);
  tl.to(rig.cinematicTarget, { x: tgt.x, y: tgt.y, z: tgt.z, duration, ease }, "<");
  if (opts.fov !== undefined) tl.to(rig, { cinematicFov: opts.fov, duration, ease }, "<");
}

/** Place the camera instantly (start of a cinematic). */
export function setCamera(tl: gsap.core.Timeline, rig: CameraRig, position: Vec3 | Vector3, target: Vec3 | Vector3, at: number | string = 0) {
  const pos = v(position);
  const tgt = v(target);
  tl.set(rig.cinematicPosition, { x: pos.x, y: pos.y, z: pos.z }, at);
  tl.set(rig.cinematicTarget, { x: tgt.x, y: tgt.y, z: tgt.z }, at);
}

export interface OrbitOptions {
  center: Vec3 | Vector3;
  radius: number;
  height: number;
  fromAngle: number;
  toAngle: number;
  duration: number;
  at?: number | string;
  ease?: string;
  /** Optional height change over the orbit. */
  toHeight?: number;
  toRadius?: number;
  targetHeight?: number;
}

/** Sweep the camera around a point — the workhorse of every chapter cinematic. */
export function orbitCamera(tl: gsap.core.Timeline, rig: CameraRig, opts: OrbitOptions) {
  const c = v(opts.center);
  const proxy = { angle: opts.fromAngle, height: opts.height, radius: opts.radius };
  const targetY = c.y + (opts.targetHeight ?? 1);
  const apply = () => {
    rig.cinematicPosition.set(
      c.x + Math.sin(proxy.angle) * proxy.radius,
      c.y + proxy.height,
      c.z + Math.cos(proxy.angle) * proxy.radius,
    );
    rig.cinematicTarget.set(c.x, targetY, c.z);
  };
  tl.to(
    proxy,
    {
      angle: opts.toAngle,
      height: opts.toHeight ?? opts.height,
      radius: opts.toRadius ?? opts.radius,
      duration: opts.duration,
      ease: opts.ease ?? "none",
      onStart: apply,
      onUpdate: apply,
    },
    opts.at ?? ">",
  );
}

/** Gentle handheld-style drift layered on top of a static shot. */
export function driftCamera(tl: gsap.core.Timeline, rig: CameraRig, amount: number, duration: number, at: number | string = "<") {
  tl.to(
    rig.cinematicPosition,
    { x: `+=${amount}`, y: `+=${amount * 0.4}`, duration, ease: "sine.inOut" },
    at,
  );
}

export function hold(tl: gsap.core.Timeline, seconds: number) {
  tl.to({}, { duration: seconds });
}
