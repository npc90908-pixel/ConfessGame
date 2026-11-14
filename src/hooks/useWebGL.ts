"use client";

import { useSyncExternalStore } from "react";
import { detectWebGL, type WebGLSupport } from "@/lib/device";

let cached: WebGLSupport | null = null;
const subscribe = () => () => {};
const getSnapshot = () => {
  if (!cached) cached = detectWebGL();
  return cached;
};
const getServerSnapshot = () => null;

/** WebGL capability of this browser. `null` during SSR / hydration. */
export function useWebGL(): WebGLSupport | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
