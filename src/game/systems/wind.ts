"use client";

import * as THREE from "three";
import { getAnimationIntensity } from "@/store/settingsStore";

/**
 * One global wind field shared by every swaying material (trees, flowers,
 * grass, banners). A single pair of uniforms is updated once per frame by
 * `tickWind`; materials patched with `applyWind` read them inside the standard
 * three.js vertex shader, so foliage keeps lighting, shadows and fog.
 *
 * The strength uniform already includes the player's animation-intensity
 * setting (and the reduced-motion cap), so it is the single place to turn the
 * world calm.
 */
export const windUniforms = {
  uWindTime: { value: 0 },
  uWindStrength: { value: 0 },
  uWindDir: { value: new THREE.Vector2(0.8, 0.6).normalize() },
};

/** Base gust amplitude multiplied by each material's `wind` factor. */
const BASE_AMPLITUDE = 0.08;

export function tickWind(elapsed: number) {
  windUniforms.uWindTime.value = elapsed;
  windUniforms.uWindStrength.value = getAnimationIntensity();
}

/** Current scalar wind strength (0–1) for JS-side animations (bobbing, banners…). */
export function windStrength() {
  return windUniforms.uWindStrength.value;
}

/**
 * Smooth gust envelope in [0, 1] for JS-side consumers that want to follow the
 * same rhythm as the shader (lanterns, hanging signs).
 */
export function gustAt(x: number, z: number, t = windUniforms.uWindTime.value) {
  const d = windUniforms.uWindDir.value;
  const phase = (x * d.x + z * d.y) * 0.18;
  return 0.5 + 0.35 * Math.sin(t * 0.9 - phase) + 0.15 * Math.sin(t * 2.3 - phase * 1.7);
}

const patched = new WeakSet<THREE.Material>();

/**
 * Patch a material so its vertices sway with the wind. `amount` scales the
 * displacement; the displacement grows with local height so roots stay put
 * (quadratic in `position.y`, measured in the model's own space and then
 * scaled by the instance/world transform).
 *
 * Works for both plain meshes and InstancedMesh (uses the instance matrix when
 * present). Idempotent per material.
 */
export function applyWind(material: THREE.Material, amount = 1) {
  if (patched.has(material)) return material;
  patched.add(material);
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uWindTime = windUniforms.uWindTime;
    shader.uniforms.uWindStrength = windUniforms.uWindStrength;
    shader.uniforms.uWindDir = windUniforms.uWindDir;
    shader.uniforms.uWindAmount = { value: amount * BASE_AMPLITUDE };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uWindTime;
        uniform float uWindStrength;
        uniform vec2 uWindDir;
        uniform float uWindAmount;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec4 windWorld = modelMatrix * instanceMatrix * vec4(position, 1.0);
          #else
            vec4 windWorld = modelMatrix * vec4(position, 1.0);
          #endif
          float windPhase = (windWorld.x * uWindDir.x + windWorld.z * uWindDir.y) * 0.18;
          float gust = 0.5 + 0.35 * sin(uWindTime * 0.9 - windPhase) + 0.15 * sin(uWindTime * 2.3 - windPhase * 1.7);
          float flutter = sin(uWindTime * 3.1 + windWorld.x * 1.3 + windWorld.z * 0.9) * 0.3;
          float h = max(position.y, 0.0);
          float k = h * h * uWindAmount * uWindStrength * (gust + flutter);
          transformed.x += uWindDir.x * k;
          transformed.z += uWindDir.y * k;
          transformed.y -= 0.15 * k * k;
        }`,
      );
  };
  // onBeforeCompile is part of the program cache key; give it a stable id.
  material.customProgramCacheKey = () => `wind:${amount}`;
  material.needsUpdate = true;
  return material;
}
