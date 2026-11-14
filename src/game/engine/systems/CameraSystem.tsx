"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CONTROLS } from "@/config/controls";
import { useSettingsStore } from "@/store/settingsStore";
import { selectControlsLocked, useUIStore } from "@/store/uiStore";
import { clamp, damp, dampAngle, lerp } from "@/lib/math";
import { consumeLook, consumeZoom } from "../input";
import { runtime } from "../runtime";
import { getWorld } from "../world";

const look = { dx: 0, dy: 0 };
const desiredPos = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const shakeOffset = new THREE.Vector3();

/**
 * Single owner of the three.js camera. Reads the CameraRig every frame:
 * – follow/boat: orbit around the player with smoothing and ground clamping
 * – cinematic: copies values that GSAP timelines tween
 * – title: slow drift for the opening starfield
 */
export function CameraSystem() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const idleTimer = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30);
    const rig = runtime.camera;
    const p = runtime.player;
    const cfg = CONTROLS.camera;
    const ui = useUIStore.getState();
    const locked = selectControlsLocked(ui);
    const settings = useSettingsStore.getState();

    if (rig.mode === "follow" || rig.mode === "boat") {
      consumeLook(look);
      const zoom = consumeZoom();
      if (!locked) {
        const sens = cfg.mouseSensitivity * settings.cameraSensitivity;
        if (Math.abs(look.dx) + Math.abs(look.dy) > 0) idleTimer.current = 0;
        rig.yaw -= look.dx * sens;
        rig.pitch = clamp(rig.pitch + look.dy * sens * (settings.invertY ? -1 : 1), cfg.minPitch, cfg.maxPitch);
        if (zoom !== 0) rig.distance = clamp(rig.distance + zoom * 0.0045, cfg.minDistance, cfg.maxDistance);
      }
      idleTimer.current += dt;

      // Boat camera gently swings behind the heading when the player isn't looking around.
      if (rig.mode === "boat" && idleTimer.current > 1.2 && p.boat.throttle !== 0) {
        rig.yaw = dampAngle(rig.yaw, p.boat.heading + Math.PI, 1.6, dt);
      } else if (rig.mode === "follow" && idleTimer.current > 2.5 && p.moving) {
        rig.yaw = dampAngle(rig.yaw, p.yaw + Math.PI, 0.6, dt);
      }

      const height = rig.mode === "boat" ? cfg.height + 0.8 : cfg.height;
      const distance = rig.mode === "boat" ? rig.distance * 1.5 : rig.distance;
      desiredTarget.set(p.position.x, p.position.y + height, p.position.z);
      const cp = Math.cos(rig.pitch);
      desiredPos.set(
        desiredTarget.x + Math.sin(rig.yaw) * cp * distance,
        desiredTarget.y + Math.sin(rig.pitch) * distance,
        desiredTarget.z + Math.cos(rig.yaw) * cp * distance,
      );
      // Keep the camera above the ground
      const world = getWorld();
      if (world && world.mode === "walk" && world.isWalkable(desiredPos.x, desiredPos.z)) {
        const g = world.getHeight(desiredPos.x, desiredPos.z) + 0.5;
        if (desiredPos.y < g) desiredPos.y = g;
      } else if (world && world.mode === "boat") {
        desiredPos.y = Math.max(desiredPos.y, 1.2);
      }

      // Blend back smoothly after a cinematic
      const k = damp(cfg.followLerp, dt);
      rig.position.lerp(desiredPos, k);
      rig.target.lerp(desiredTarget, damp(cfg.followLerp * 1.4, dt));
      rig.fov = lerp(rig.fov, cfg.fov + (p.running ? 4 : 0), damp(3, dt));
    } else if (rig.mode === "cinematic") {
      rig.position.copy(rig.cinematicPosition);
      rig.target.copy(rig.cinematicTarget);
      rig.fov = lerp(rig.fov, rig.cinematicFov, damp(6, dt));
    } else {
      // title
      const t = runtime.clock;
      desiredPos.set(Math.sin(t * 0.05) * 7, 6.5 + Math.sin(t * 0.09) * 0.8, 29 + Math.cos(t * 0.05) * 2);
      desiredTarget.set(0, 2.2 + Math.sin(t * 0.04) * 0.4, -4);
      rig.position.lerp(desiredPos, damp(1.5, dt));
      rig.target.lerp(desiredTarget, damp(1.5, dt));
      rig.fov = lerp(rig.fov, 55, damp(2, dt));
    }

    // Apply
    if (rig.shake > 0.001) {
      shakeOffset.set((Math.random() - 0.5) * rig.shake, (Math.random() - 0.5) * rig.shake, 0);
      rig.shake *= 1 - damp(4, dt);
    } else {
      shakeOffset.set(0, 0, 0);
    }
    camera.position.copy(rig.position).add(shakeOffset);
    camera.lookAt(rig.target);
    if (Math.abs(camera.fov - rig.fov) > 0.01) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
