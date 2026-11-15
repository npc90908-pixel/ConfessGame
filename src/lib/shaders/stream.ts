import { glslNoise } from "./common";

/**
 * Small flowing stream ribbon: two layers of drifting value noise, foam on
 * the crests and along the banks, soft alpha fall-off at the ribbon edges.
 * `uFlow` is the world-space flow direction on the XZ plane.
 */
export const streamVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

export const streamFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uFlow;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vWorld;
  ${glslNoise}
  void main() {
    vec2 p = vWorld.xz - uFlow * uTime * 1.1;
    float n = vnoise(p * vec2(0.55, 1.6)) * 0.6 + vnoise(p * vec2(1.7, 3.2) + 7.0) * 0.4;
    // ribbon edge (v = 0..1 across the width)
    float edge = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
    vec3 col = mix(uDeep, uShallow, n);
    float crest = smoothstep(0.74, 0.92, n);
    float bankFoam = (1.0 - edge) * (0.35 + 0.35 * vnoise(p * 4.0));
    col = mix(col, uFoam, clamp(crest * 0.55 + bankFoam, 0.0, 1.0));
    float alpha = uOpacity * (0.45 + 0.55 * edge);
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;
