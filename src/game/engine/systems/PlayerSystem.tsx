"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CONTROLS } from "@/config/controls";
import { audio } from "@/game/systems/audio/AudioManager";
import { selectControlsLocked, useUIStore } from "@/store/uiStore";
import { clamp, damp, dampAngle, lerp } from "@/lib/math";
import { consumeAction, getMoveAxis, isActionHeld } from "../input";
import { runtime } from "../runtime";
import { clampToWalkable, getWorld, resolveColliders } from "../world";
import { Character } from "@/game/objects/Character";

const axis = { x: 0, y: 0 };
const out = { x: 0, z: 0 };

/**
 * Third-person kinematic character controller.
 * – Camera-relative WASD / joystick movement with acceleration.
 * – Gravity, jump, ground snapping against the environment height field.
 * – Walkable-region clamping + circle/box collider push-out.
 */
export function PlayerSystem() {
  const stride = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const p = runtime.player;
    const world = getWorld();
    const ui = useUIStore.getState();
    const locked = selectControlsLocked(ui);
    runtime.clock += rawDt;
    if (!locked) runtime.time += dt;

    if (p.mode !== "walk" || !world) return;

    const cfg = CONTROLS.player;
    getMoveAxis(axis);
    if (locked) {
      axis.x = 0;
      axis.y = 0;
    }
    const running = !locked && isActionHeld("run");
    const maxSpeed = running ? cfg.runSpeed : cfg.walkSpeed;

    // Camera-relative basis
    const camYaw = runtime.camera.yaw;
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const rx = -fz;
    const rz = fx;
    const wantX = (fx * axis.y + rx * axis.x) * maxSpeed;
    const wantZ = (fz * axis.y + rz * axis.x) * maxSpeed;
    const hasInput = Math.abs(axis.x) + Math.abs(axis.y) > 0.01;

    const accel = hasInput ? cfg.acceleration : cfg.deceleration;
    p.velocity.x = lerp(p.velocity.x, wantX, damp(accel / 3, dt));
    p.velocity.z = lerp(p.velocity.z, wantZ, damp(accel / 3, dt));
    if (!hasInput && Math.hypot(p.velocity.x, p.velocity.z) < 0.05) {
      p.velocity.x = 0;
      p.velocity.z = 0;
    }

    // Facing
    if (hasInput) {
      const targetYaw = Math.atan2(wantX, wantZ);
      p.yaw = dampAngle(p.yaw, targetYaw, cfg.turnSpeed, dt);
    }

    // Jump
    if (!locked && p.grounded && consumeAction("jump")) {
      p.velocity.y = cfg.jumpVelocity;
      p.grounded = false;
      p.jumpTime = runtime.clock;
      audio.sfx("jump", { volume: 0.5 });
    } else {
      consumeAction("jump");
    }
    p.velocity.y += cfg.gravity * dt;
    p.velocity.y = Math.max(p.velocity.y, -30);

    // Horizontal move with walkable clamp + colliders
    const fromX = p.position.x;
    const fromZ = p.position.z;
    const toX = fromX + p.velocity.x * dt;
    const toZ = fromZ + p.velocity.z * dt;
    clampToWalkable(fromX, fromZ, toX, toZ, world.isWalkable, out);
    resolveColliders(out.x, out.z, cfg.radius, world.colliders, out);
    if (!world.isWalkable(out.x, out.z)) {
      out.x = fromX;
      out.z = fromZ;
    }
    // Kill velocity into blocked directions so the character doesn't "run in place" too fast
    if (Math.abs(out.x - toX) > 1e-3) p.velocity.x *= 0.5;
    if (Math.abs(out.z - toZ) > 1e-3) p.velocity.z *= 0.5;
    p.position.x = out.x;
    p.position.z = out.z;

    // Vertical: ground snapping
    const groundY = world.getHeight(p.position.x, p.position.z);
    let y = p.position.y + p.velocity.y * dt;
    if (y <= groundY + 0.001 && p.velocity.y <= 0) {
      if (!p.grounded && runtime.clock - p.jumpTime > 0.2) {
        audio.sfx("footstep", { volume: 0.35, rate: 0.9 });
      }
      y = groundY;
      p.velocity.y = 0;
      p.grounded = true;
    } else {
      p.grounded = false;
    }
    if (p.grounded) {
      // Smoothly ride slopes instead of snapping hard.
      y = lerp(p.position.y, groundY, clamp(damp(cfg.stepSmoothing, dt) * 1.5, 0, 1));
      if (Math.abs(y - groundY) < 0.01) y = groundY;
    }
    p.position.y = y;

    // Footsteps
    const speed = Math.hypot(p.velocity.x, p.velocity.z);
    p.speed = speed;
    p.moving = speed > 0.15;
    p.running = running && p.moving;
    if (p.grounded && p.moving) {
      stride.current += speed * dt;
      if (stride.current > 1.35) {
        stride.current = 0;
        audio.sfx("footstep", { volume: 0.22, rate: 0.9 + Math.random() * 0.25 });
      }
    }

    // Safety: fell through the world
    if (p.position.y < -40) {
      p.position.set(world.respawn[0], world.respawn[1], world.respawn[2]);
      p.velocity.set(0, 0, 0);
    }
  });

  return <Character />;
}
