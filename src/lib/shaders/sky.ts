import { glslNoise } from "./common";

export const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Push to the far plane so the dome never clips.
    gl_Position.z = gl_Position.w * 0.99999;
  }
`;

export const skyFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uNebulaA;
  uniform vec3 uNebulaB;
  uniform float uNebula;
  uniform float uStars;
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSun;
  uniform float uSunSize;
  uniform vec3 uMoonDir;
  uniform float uMoon;
  varying vec3 vDir;
  ${glslNoise}

  float starLayer(vec3 d, float cells, float threshold, float twinkleSpeed) {
    vec3 p = d * cells;
    vec3 cell = floor(p);
    float h = hash31(cell);
    if (h > threshold) return 0.0;
    vec3 center = cell + 0.5 + (vec3(hash31(cell + 1.7), hash31(cell + 3.1), hash31(cell + 5.3)) - 0.5) * 0.7;
    float dist = length(p - center);
    float size = 0.08 + hash31(cell + 9.1) * 0.12;
    float star = smoothstep(size, 0.0, dist);
    float twinkle = 0.65 + 0.35 * sin(uTime * twinkleSpeed * (0.5 + hash31(cell + 2.3)) + h * 50.0);
    return star * twinkle * (0.5 + h / threshold);
  }

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    // Base gradient
    vec3 col = mix(uHorizon, uTop, smoothstep(-0.05, 0.6, h));
    col = mix(uBottom, col, smoothstep(-0.6, 0.02, h));

    // Nebula bands
    vec2 uv = vec2(atan(d.z, d.x) * 1.2, asin(clamp(h, -1.0, 1.0)) * 2.0);
    float n = fbm(uv * 1.6 + vec2(uTime * 0.004, 0.0));
    float n2 = fbm(uv * 3.1 - vec2(0.0, uTime * 0.006) + 4.0);
    float nebula = smoothstep(0.42, 0.78, n) * smoothstep(-0.15, 0.5, h);
    col += uNebulaA * nebula * 0.55 * uNebula;
    col += uNebulaB * smoothstep(0.5, 0.85, n2) * 0.35 * uNebula * smoothstep(-0.1, 0.4, h);

    // Stars (two layers), fading toward the horizon
    float starMask = smoothstep(-0.08, 0.25, h) * uStars;
    float s = starLayer(d, 70.0, 0.045, 2.0) + starLayer(d, 160.0, 0.03, 3.5) * 0.7;
    col += vec3(0.95, 0.93, 1.0) * s * starMask;

    // Sun / moon discs with soft glow
    float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
    float sunDisc = smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.3, sunDot);
    float sunGlow = pow(sunDot, 12.0) * 0.6 + pow(sunDot, 48.0) * 0.8;
    col += uSunColor * (sunDisc * 2.0 + sunGlow) * uSun;

    float moonDot = max(dot(d, normalize(uMoonDir)), 0.0);
    float moonDisc = smoothstep(0.9975, 0.9988, moonDot);
    float moonGlow = pow(moonDot, 40.0) * 0.35 + pow(moonDot, 400.0) * 0.6;
    col += vec3(0.85, 0.88, 1.0) * (moonDisc * 1.6 + moonGlow) * uMoon;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;
