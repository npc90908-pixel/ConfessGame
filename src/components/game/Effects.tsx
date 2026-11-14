"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, N8AO, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import { runtime } from "@/game/engine/runtime";
import { useQuality } from "@/game/systems/quality";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Selective post-processing. Bloom is the signature of the art direction and
 * stays on every tier; depth of field and ambient occlusion only run on
 * desktops that can afford them.
 */
export function Effects() {
  const { preset, tier } = useQuality();
  const reduced = useReducedMotion();
  const dof = useRef<DepthOfFieldEffect>(null);

  useFrame(() => {
    if (!dof.current) return;
    // Focus on the player (or the cinematic target) — world units.
    const rig = runtime.camera;
    const focus = rig.mode === "cinematic" ? rig.cinematicTarget : runtime.player.position;
    const dist = rig.position.distanceTo(focus);
    dof.current.cocMaterial.worldFocusDistance = dist;
    dof.current.cocMaterial.worldFocusRange = Math.max(6, dist * 1.2);
  });

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
