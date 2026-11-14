"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion, useSettingsStore } from "@/store/settingsStore";

/** Effective reduced-motion flag (settings override + OS preference). */
export function useReducedMotion(): boolean {
  const motion = useSettingsStore((s) => s.motion);
  const [reduced, setReduced] = useState(() => prefersReducedMotion(motion));

  useEffect(() => {
    const update = () => {
      const value = prefersReducedMotion(motion);
      setReduced(value);
      document.documentElement.dataset.reducedMotion = value ? "true" : "false";
    };
    update();
    // Very old browsers / test environments may lack matchMedia entirely.
    const mq = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    mq?.addEventListener("change", update);
    return () => mq?.removeEventListener("change", update);
  }, [motion]);

  return reduced;
}
