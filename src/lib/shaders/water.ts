import { glslNoise } from "./common";

/**
 * Stylised ocean: Gerstner-ish vertex displacement, animated normal map
 * detail, fresnel, moon/sun specular, depth-less foam near the shore markers
 * and a sunrise colour blend driven by `uSunrise`.
 */
export const waterVertex = /* glsl */ `
  uniform float uTime;
  uniform float uWaveHeight;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vWave;

  vec3 gerstner(vec2 dir, float steep, float wavelength, float speed, vec3 p, inout vec3 tangent, inout vec3 binormal) {
    float k = 6.28318 / wavelength;
    float c = sqrt(9.8 / k) * speed;
    vec2 d = normalize(dir);
    float f = k * (dot(d, p.xz) - c * uTime);
    float a = steep / k;
    tangent += vec3(-d.x * d.x * steep * sin(f), d.x * steep * cos(f), -d.x * d.y * steep * sin(f));
    binormal += vec3(-d.x * d.y * steep * sin(f), d.y * steep * cos(f), -d.y * d.y * steep * sin(f));
    return vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  }

  void main() {
    vUv = uv;
    vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 tangent = vec3(1.0, 0.0, 0.0);
    vec3 binormal = vec3(0.0, 0.0, 1.0);
    vec3 disp = vec3(0.0);
    disp += gerstner(vec2(1.0, 0.6), 0.12 * uWaveHeight, 14.0, 0.5, p, tangent, binormal);
    disp += gerstner(vec2(-0.7, 1.0), 0.10 * uWaveHeight, 9.0, 0.6, p, tangent, binormal);
    disp += gerstner(vec2(0.3, -1.0), 0.08 * uWaveHeight, 5.0, 0.7, p, tangent, binormal);
    disp += gerstner(vec2(-1.0, -0.2), 0.05 * uWaveHeight, 2.6, 0.9, p, tangent, binormal);
    p += disp;
    vWave = disp.y;
    vNormal = normalize(cross(binormal, tangent));
    vWorldPos = p;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

export const waterFragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform sampler2D uNormalMap;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSunriseShallow;
  uniform vec3 uSunriseDeep;
  uniform float uSunrise;
  uniform vec3 uMoonDir;
  uniform vec3 uSunDir;
  uniform vec3 uFoamColor;
  uniform vec3 uCameraPos;
  uniform vec3 uFogColor;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vWave;
  ${glslNoise}

  void main() {
    vec2 uv1 = vWorldPos.xz * 0.045 + vec2(uTime * 0.012, uTime * 0.008);
    vec2 uv2 = vWorldPos.xz * 0.11 - vec2(uTime * 0.009, -uTime * 0.014);
    vec3 n1 = texture2D(uNormalMap, uv1).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormalMap, uv2).xyz * 2.0 - 1.0;
    vec3 detail = normalize(vec3(n1.xy + n2.xy, n1.z + n2.z) * vec3(0.55, 0.55, 1.0));
    vec3 N = normalize(vNormal + vec3(detail.x, 0.0, detail.y) * 0.9);

    vec3 V = normalize(uCameraPos - vWorldPos);
    float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 shallow = mix(uShallow, uSunriseShallow, uSunrise);
    vec3 deep = mix(uDeep, uSunriseDeep, uSunrise);
    float depthMix = smoothstep(-0.4, 0.5, vWave + fbm(vWorldPos.xz * 0.08 + uTime * 0.02) * 0.4 - 0.2);
    vec3 col = mix(deep, shallow, depthMix);

    // Sky reflection tint
    vec3 skyNight = vec3(0.10, 0.09, 0.26);
    vec3 skySunrise = vec3(0.95, 0.55, 0.55);
    col = mix(col, mix(skyNight, skySunrise, uSunrise), fresnel * 0.75);

    // Specular highlights (moon by night, sun at dawn)
    vec3 L = normalize(mix(uMoonDir, uSunDir, uSunrise));
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), 180.0) * 2.4 + pow(max(dot(N, H), 0.0), 28.0) * 0.4;
    vec3 specColor = mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.78, 0.5), uSunrise);
    col += specColor * spec;

    // Glitter sparkles across the surface
    float sparkle = pow(max(vnoise(vWorldPos.xz * 2.5 + uTime * 0.6), 0.0), 18.0) * 0.6;
    col += specColor * sparkle * (0.4 + fresnel);

    // Foam on crests
    float foam = smoothstep(0.22, 0.45, vWave) * (0.5 + 0.5 * vnoise(vWorldPos.xz * 1.5 + uTime * 0.3));
    col = mix(col, uFoamColor, foam * 0.6);

    // Distance fog
    float dist = length(uCameraPos - vWorldPos);
    float fog = smoothstep(uFogNear, uFogFar, dist);
    col = mix(col, uFogColor, fog);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
