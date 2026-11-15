// @vitest-environment jsdom
/**
 * The shared wind field: one set of uniforms, strength driven by the
 * animation-intensity setting (and capped by reduced motion), and a material
 * patch that injects the sway into three's standard vertex shader.
 */
import * as THREE from "three";
import { beforeEach, describe, expect, it } from "vitest";
import { applyWind, gustAt, tickWind, windUniforms, windStrength } from "@/game/systems/wind";
import { useSettingsStore } from "@/store/settingsStore";

beforeEach(() => {
  useSettingsStore.getState().resetToDefaults();
  useSettingsStore.getState().setMotion("full");
});

describe("wind field", () => {
  it("follows the animation-intensity setting and the reduced-motion cap", () => {
    tickWind(2.5);
    expect(windUniforms.uWindTime.value).toBe(2.5);
    expect(windStrength()).toBe(1);
    useSettingsStore.getState().setAnimationIntensity(0.5);
    tickWind(3);
    expect(windStrength()).toBeCloseTo(0.5);
    useSettingsStore.getState().setAnimationIntensity(1);
    useSettingsStore.getState().setMotion("reduced");
    tickWind(4);
    expect(windStrength()).toBeLessThanOrEqual(0.3);
  });

  it("gusts stay inside [0, 1] and vary over space and time", () => {
    const samples: number[] = [];
    for (let t = 0; t < 20; t += 0.37) for (let x = -40; x <= 40; x += 13) samples.push(gustAt(x, x * 0.3, t));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.5);
  });

  it("patches a standard material once and injects the sway after begin_vertex", () => {
    const mat = new THREE.MeshStandardMaterial();
    expect(applyWind(mat, 2)).toBe(mat);
    applyWind(mat, 5); // idempotent — second call must not re-wrap
    const shader = {
      uniforms: {} as Record<string, THREE.IUniform>,
      vertexShader: "#include <common>\nvoid main() {\n#include <begin_vertex>\n#include <project_vertex>\n}",
      fragmentShader: "",
    };
    mat.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(shader.uniforms.uWindTime).toBe(windUniforms.uWindTime);
    expect(shader.uniforms.uWindStrength).toBe(windUniforms.uWindStrength);
    expect(shader.uniforms.uWindAmount.value).toBeCloseTo(2 * 0.08);
    expect(shader.vertexShader).toContain("uniform float uWindTime;");
    expect(shader.vertexShader.indexOf("#include <begin_vertex>")).toBeLessThan(shader.vertexShader.indexOf("transformed.x += uWindDir.x * k;"));
    expect(shader.vertexShader.indexOf("transformed.x += uWindDir.x * k;")).toBeLessThan(shader.vertexShader.indexOf("#include <project_vertex>"));
    expect(shader.vertexShader).toContain("USE_INSTANCING");
    expect(mat.customProgramCacheKey()).toContain("wind:2");
  });

  it("keeps an existing onBeforeCompile hook", () => {
    const mat = new THREE.MeshStandardMaterial();
    let called = 0;
    mat.onBeforeCompile = () => {
      called += 1;
    };
    applyWind(mat, 1);
    const shader = { uniforms: {} as Record<string, THREE.IUniform>, vertexShader: "#include <common>\n#include <begin_vertex>", fragmentShader: "" };
    mat.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(called).toBe(1);
    expect(shader.vertexShader).toContain("uWindAmount");
  });
});
