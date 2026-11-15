"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";
import { runtime } from "@/game/engine/runtime";
import { useQuality } from "@/game/systems/quality";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * Selective post-processing. Bloom is the signature of the art direction and
 * stays on every tier; depth of field and ambient occlusion only run on
 * desktops that can afford them.
 */
export function Effects() {
  const { preset, tier } = useQuality();
  const enabled = useSettingsStore((s) => s.postProcessing);
  const reduced = useReducedMotion();
  const dof = useRef<DepthOfFieldEffect>(null);
  const gl = useThree((s) => s.gl);

  // The composer owns tone mapping while it is mounted; hand it back to the
  // renderer when the player switches post-processing off.
  useEffect(() => {
    if (enabled) return;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
  }, [enabled, gl]);

  useFrame(() => {
    if (!dof.current) return;
    // Focus on the player (or the cinematic target) — world units.
    const rig = runtime.camera;
    const focus = rig.mode === "cinematic" ? rig.cinematicTarget : runtime.player.position;
    const dist = rig.position.distanceTo(focus);
    dof.current.cocMaterial.worldFocusDistance = dist;
    dof.current.cocMaterial.worldFocusRange = Math.max(6, dist * 1.2);
  });

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={tier === "high" ? 4 : 0} enableNormalPass={false} resolutionScale={tier === "low" ? 0.75 : 1}>
      {preset.ambientOcclusion ? (
        <N8AO halfRes quality="performance" aoRadius={1.2} intensity={1.6} distanceFalloff={1} color="#1a0f2e" />
      ) : (
        <></>
      )}
      <Bloom
        mipmapBlur
        luminanceThreshold={tier === "low" ? 0.9 : 0.82}
        luminanceSmoothing={0.25}
        intensity={tier === "low" ? 0.7 : 1.05}
        radius={0.65}
        levels={tier === "low" ? 4 : 6}
      />
      {preset.depthOfField && !reduced ? (
        <DepthOfField ref={dof} worldFocusDistance={6} worldFocusRange={8} bokehScale={2.4} resolutionScale={0.5} />
      ) : (
        <></>
      )}
      {preset.vignette ? <Vignette eskil={false} offset={0.22} darkness={0.72} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
