import { describe, expect, it } from "vitest";
import { angleDelta, clamp, createRng, dampAngle, inverseLerp, lerp, makeNoise2D, remap, smoothstep } from "@/lib/math";

describe("math utilities", () => {
  it("clamps, lerps and remaps", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(inverseLerp(0, 10, 2.5)).toBe(0.25);
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });

  it("measures the shortest signed angle", () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    const towards = dampAngle(0, Math.PI / 2, 10, 1);
    expect(towards).toBeGreaterThan(0);
    expect(towards).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
  });

  it("produces deterministic seeded randomness", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 8 }, () => a.next());
    const seqB = Array.from({ length: 8 }, () => b.next());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it("produces smooth deterministic noise", () => {
    const { noise, fbm } = makeNoise2D(7);
    expect(noise(1.5, 2.5)).toBe(makeNoise2D(7).noise(1.5, 2.5));
    const a = noise(3.0, 3.0);
    const b = noise(3.001, 3.0);
    expect(Math.abs(a - b)).toBeLessThan(0.05);
    expect(Math.abs(fbm(10, 10))).toBeLessThanOrEqual(1.5);
  });
});
