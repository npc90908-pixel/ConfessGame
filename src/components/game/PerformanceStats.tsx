"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useQualityStore } from "@/game/systems/quality";
import { useSettingsStore } from "@/store/settingsStore";

/**
 * Lightweight FPS sampler (inside the canvas) — publishes to the quality
 * store twice a second. The HUD renders the number when enabled in settings.
 */
export function PerformanceStats() {
  const enabled = useSettingsStore((s) => s.showPerformance);
  const setFps = useQualityStore((s) => s.setFps);
  const gl = useThree((s) => s.gl);
  const frames = useRef(0);
  const last = useRef(0);

  useFrame(({ clock }) => {
    if (!enabled) return;
    frames.current += 1;
    const now = clock.elapsedTime;
    if (now - last.current >= 0.5) {
      setFps(Math.round(frames.current / (now - last.current)));
      frames.current = 0;
      last.current = now;
      // Keep draw-call info in a global for quick inspection from devtools.
      (window as unknown as { __ajtyhStats?: unknown }).__ajtyhStats = { ...gl.info.render, memory: { ...gl.info.memory } };
    }
  });

  return null;
}
