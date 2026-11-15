import type { QualityTier } from "@/types/game";

export interface WebGLSupport {
  supported: boolean;
  webgl2: boolean;
  renderer?: string;
  reason?: string;
}

/** Feature-detect WebGL without touching React. Safe to call on the server (returns unsupported). */
export function detectWebGL(): WebGLSupport {
  if (typeof document === "undefined") return { supported: false, webgl2: false, reason: "no-document" };
  try {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    const gl =
      gl2 ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ??
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return { supported: false, webgl2: false, reason: "no-context" };
    let renderer: string | undefined;
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (debugInfo) {
      renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
    }
    const loseContext = gl.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();
    return { supported: true, webgl2: Boolean(gl2), renderer };
  } catch (error) {
    return { supported: false, webgl2: false, reason: error instanceof Error ? error.message : "error" };
  }
}

export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return Math.min(window.innerWidth, window.innerHeight) < 820 && isTouchDevice();
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Pick an initial quality tier from cheap heuristics; the runtime monitor adjusts it later. */
export function guessQualityTier(): QualityTier {
  if (typeof window === "undefined") return "medium";
  const mobile = isTouchDevice();
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const dpr = window.devicePixelRatio || 1;
  if (mobile) {
    if (cores >= 8 && memory >= 6) return "medium";
    return "low";
  }
  if (cores >= 8 && memory >= 8 && dpr <= 2) return "high";
  if (cores >= 4) return "medium";
  return "low";
}

export interface QualityPreset {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  depthOfField: boolean;
  ambientOcclusion: boolean;
  vignette: boolean;
  particleScale: number;
  instanceScale: number;
  anisotropy: number;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  low: {
    dpr: [0.75, 1],
    shadows: false,
    shadowMapSize: 512,
    bloom: true,
    depthOfField: false,
    ambientOcclusion: false,
    vignette: true,
    particleScale: 0.35,
    instanceScale: 0.5,
    anisotropy: 1,
  },
  medium: {
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    bloom: true,
    depthOfField: false,
    ambientOcclusion: false,
    vignette: true,
    particleScale: 0.7,
    instanceScale: 0.8,
    anisotropy: 4,
  },
  high: {
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    depthOfField: true,
    ambientOcclusion: true,
    vignette: true,
    particleScale: 1,
    instanceScale: 1,
    anisotropy: 8,
  },
};
