export const TAU = Math.PI * 2;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const inverseLerp = (a: number, b: number, v: number) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v: number, inMin: number, inMax: number, outMin: number, outMax: number) =>
  lerp(outMin, outMax, clamp(inverseLerp(inMin, inMax, v), 0, 1));
export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Frame-rate independent exponential smoothing factor. */
export const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);

/** Shortest signed difference between two angles (radians). */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  return current + angleDelta(current, target) * damp(lambda, dt);
}

export const dist2D = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);

/** Deterministic pseudo-random generator (mulberry32). */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

export type Rng = ReturnType<typeof createRng>;

/** 2D value noise with smooth interpolation — enough for stylised terrain. */
export function makeNoise2D(seed = 1) {
  const rng = createRng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

  const noise = (x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v) * 0.5; // roughly -1..1
  };

  const fbm = (x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5) => {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += noise(x * freq, y * freq) * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  };

  return { noise, fbm };
}

export type Noise2D = ReturnType<typeof makeNoise2D>;

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
export function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}
