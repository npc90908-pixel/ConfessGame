/**
 * Shared movement conventions for every controller (walk, boat, cinematic
 * helpers). One place defines what "forward" means so the camera, the
 * character and vehicles can never disagree about signs:
 *
 *   facing(yaw) = (sin yaw, 0, cos yaw)          — an object with rotation.y = yaw
 *                                                 looks along +z rotated by yaw
 *   camera sits at target + facing(rig.yaw) * d  — i.e. rig.yaw = playerYaw + π
 *                                                 puts the camera *behind* the player
 *   camera forward = -facing(rig.yaw)            — the direction the camera looks
 */
import { useSettingsStore } from "@/store/settingsStore";

export interface Basis {
  /** Forward (the way the camera looks), unit length on the XZ plane. */
  fx: number;
  fz: number;
  /** Right-hand side of the camera, unit length. */
  rx: number;
  rz: number;
}

/** Unit vector an object faces for a given yaw. */
export function facingVector(yaw: number, out: { x: number; z: number }) {
  out.x = Math.sin(yaw);
  out.z = Math.cos(yaw);
  return out;
}

/** Yaw that faces along (x, z). Inverse of `facingVector`. */
export function yawFromDirection(x: number, z: number) {
  return Math.atan2(x, z);
}

/** Camera-relative basis from the rig yaw (camera orbit angle). */
export function cameraBasis(camYaw: number, out: Basis) {
  out.fx = -Math.sin(camYaw);
  out.fz = -Math.cos(camYaw);
  out.rx = -out.fz;
  out.rz = out.fx;
  return out;
}

/** Camera yaw that places the camera straight behind something facing `yaw`. */
export function cameraYawBehind(yaw: number) {
  return yaw + Math.PI;
}

/** Player-tuned responsiveness multiplier (settings → acceleration / turn rates). */
export function movementResponse() {
  return useSettingsStore.getState().movementSensitivity;
}
