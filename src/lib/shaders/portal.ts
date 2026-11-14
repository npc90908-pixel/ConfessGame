import { glslNoise } from "./common";

/** Swirling portal disc with an energetic rim; `uPower` ramps it from dormant to open. */
export const portalVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const portalFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorRim;
  varying vec2 vUv;
  ${glslNoise}

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float a = atan(p.y, p.x);
    // Spiral distortion
    float swirl = a + r * 3.0 - uTime * 1.4;
    vec2 q = vec2(cos(swirl), sin(swirl)) * r;
    float n = fbm(q * 2.6 + uTime * 0.25);
    float n2 = fbm(q * 5.0 - uTime * 0.4 + 7.0);
    float core = smoothstep(1.0, 0.0, r) * uPower;
    vec3 col = mix(uColorA, uColorB, n);
    col += uColorRim * pow(n2, 2.0) * 0.8;
    // Bright rim ring
    float rim = smoothstep(0.12, 0.0, abs(r - (0.92 - 0.06 * (1.0 - uPower)))) * (1.5 + 0.5 * sin(uTime * 3.0));
    col += uColorRim * rim * 1.8;
    // Inner dark eye
    float eye = smoothstep(0.0, 0.5, r);
    col *= mix(0.25, 1.0, eye);
    float alpha = (core * (0.55 + n * 0.6) + rim) * uPower;
    alpha *= smoothstep(1.0, 0.86, r);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col * (1.0 + uPower), clamp(alpha, 0.0, 1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Vertical light beam that fades with height and distance from the axis. */
export const beamVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const beamFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float vertical = pow(1.0 - vUv.y, 1.6);
    float edge = pow(abs(dot(normalize(vNormal), normalize(vViewDir))), 1.2);
    float flicker = 0.9 + 0.1 * sin(uTime * 5.0 + vUv.y * 10.0);
    float a = vertical * edge * uOpacity * flicker;
    if (a < 0.005) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
