"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, Preload } from "@react-three/drei";
import * as THREE from "three";
import { CameraSystem } from "@/game/engine/systems/CameraSystem";
import { InteractionSystem } from "@/game/engine/systems/InteractionSystem";
import { PlayerSystem } from "@/game/engine/systems/PlayerSystem";
import { WindSystem } from "@/game/engine/systems/WindSystem";
import { useLookControls } from "@/game/engine/systems/LookControls";
import { SceneRouter } from "@/game/scenes/SceneRouter";
import { useQuality, useQualityStore } from "@/game/systems/quality";
import { useUIStore } from "@/store/uiStore";
import { Effects } from "./Effects";
import { PerformanceStats } from "./PerformanceStats";

/**
 * The single WebGL canvas for the whole experience. It is mounted once and
 * stays alive across title screen, chapters and endings — only its content
 * changes, so the GL context and compiled shaders are never thrown away.
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { preset, tier, isAuto } = useQuality();
  const phase = useUIStore((s) => s.phase);
  const degrade = useQualityStore((s) => s.degrade);
  const improve = useQualityStore((s) => s.improve);
  useLookControls(containerRef, phase === "playing");

  // Expose the tier for CSS-driven tweaks (e.g. lighter blur on low-end).
  useEffect(() => {
    document.documentElement.dataset.quality = tier;
  }, [tier]);

  return (
    <div ref={containerRef} className="absolute inset-0 touch-none" aria-hidden>
      <Canvas
        dpr={preset.dpr}
        shadows={preset.shadows ? { type: THREE.PCFSoftShadowMap } : false}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: false,
        }}
        camera={{ fov: 50, near: 0.1, far: 600, position: [0, 3, 14] }}
        frameloop="always"
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor(new THREE.Color("#06040f"));
          scene.background = new THREE.Color("#06040f");
        }}
      >
        {isAuto && (
          <PerformanceMonitor
            flipflops={3}
            factor={0.75}
            bounds={(refreshRate) => (refreshRate > 90 ? [45, 85] : [35, 58])}
            onDecline={() => degrade()}
            onIncline={() => improve()}
          />
        )}
        <Suspense fallback={null}>
          <SceneRouter />
          {phase === "playing" && <PlayerSystem />}
          <InteractionSystem />
          <CameraSystem />
          <WindSystem />
          <Effects />
          <Preload all />
        </Suspense>
        <PerformanceStats />
      </Canvas>
    </div>
  );
}
