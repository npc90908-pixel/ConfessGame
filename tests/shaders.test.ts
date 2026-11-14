/**
 * Compiles every custom GLSL program with the Khronos reference validator,
 * assembled exactly the way three.js feeds a ShaderMaterial to WebGL 2
 * (GLSL ES 3.00 prefix, built-in uniforms/attributes, resolved #includes).
 * A typo in a shader would otherwise only show up as a black mesh in the
 * browser console.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ShaderChunk } from "three";
import { describe, expect, it } from "vitest";
import { particleFragment, particleVertex } from "@/lib/shaders/particles";
import { beamFragment, beamVertex, portalFragment, portalVertex } from "@/lib/shaders/portal";
import { skyFragment, skyVertex } from "@/lib/shaders/sky";
import { waterFragment, waterVertex } from "@/lib/shaders/water";

const PROGRAMS = {
  sky: [skyVertex, skyFragment],
  particles: [particleVertex, particleFragment],
  portal: [portalVertex, portalFragment],
  beam: [beamVertex, beamFragment],
  water: [waterVertex, waterFragment],
} as const;

const PRECISION = `
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp samplerCube;
precision highp sampler3D;
precision highp sampler2DArray;
precision highp sampler2DShadow;
precision highp samplerCubeShadow;
precision highp sampler2DArrayShadow;
precision highp isampler2D;
precision highp isampler3D;
precision highp isamplerCube;
precision highp isampler2DArray;
precision highp usampler2D;
precision highp usampler3D;
precision highp usamplerCube;
precision highp usampler2DArray;
#define HIGH_PRECISION
#define SHADER_TYPE ShaderMaterial
#define SHADER_NAME test
`;

const VERTEX_PREFIX = `#version 300 es
#define attribute in
#define varying out
#define texture2D texture
${PRECISION}
#define USE_FOG
#define FOG_EXP2 0
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
`;

const FRAGMENT_PREFIX = `#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
#define textureCube texture
#define texture2DProj textureProj
#define texture2DLodEXT textureLod
#define texture2DProjLodEXT textureProjLod
#define textureCubeLodEXT textureLod
#define texture2DGradEXT textureGrad
#define texture2DProjGradEXT textureProjGrad
#define textureCubeGradEXT textureGrad
${PRECISION}
#define TONE_MAPPING
#define OPAQUE
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
uniform float toneMappingExposure;
vec3 toneMapping( vec3 color ) { return color; }
vec4 linearToOutputTexel( vec4 value ) { return value; }
`;

function resolveIncludes(source: string): string {
  return source.replace(/#include <([\w\d./]+)>/g, (_, name: string) => {
    const chunk = (ShaderChunk as Record<string, string>)[name];
    if (!chunk) throw new Error(`Unknown shader chunk "${name}"`);
    return resolveIncludes(chunk);
  });
}

function validatorPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("glslang-validator-prebuilt-predownloaded") as { path: string };
    if (!existsSync(mod.path)) return null;
    chmodSync(mod.path, 0o755);
    execFileSync(mod.path, ["--version"], { stdio: "ignore" });
    return mod.path;
  } catch {
    return null;
  }
}

const validator = validatorPath();
const dir = mkdtempSync(join(tmpdir(), "ajtyh-shaders-"));

describe.skipIf(!validator)("GLSL programs", () => {
  for (const [name, [vertex, fragment]] of Object.entries(PROGRAMS)) {
    it(`${name} compiles as GLSL ES 3.00 (vertex + fragment)`, () => {
      const stages: Array<[string, string, string]> = [
        ["vert", VERTEX_PREFIX, vertex],
        ["frag", FRAGMENT_PREFIX, fragment],
      ];
      for (const [stage, prefix, body] of stages) {
        const file = join(dir, `${name}.${stage}`);
        writeFileSync(file, prefix + resolveIncludes(body));
        let output = "";
        try {
          output = execFileSync(validator!, ["-S", stage, file], { encoding: "utf8" });
        } catch (error) {
          const e = error as { stdout?: string; stderr?: string };
          output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
          throw new Error(`${name} ${stage} shader failed to compile:\n${output}`);
        }
        expect(output).not.toMatch(/ERROR/);
      }
    });
  }
});
