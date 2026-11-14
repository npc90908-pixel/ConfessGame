export const particleVertex = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aVelocity;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform vec3 uBounds;
  uniform vec3 uCenter;
  uniform float uTwinkle;
  uniform float uSway;
  uniform float uGravity;
  varying float vAlpha;
  varying float vSeed;
  varying vec3 vColor;

  void main() {
    vSeed = aSeed;
    vColor = aColor;
    float t = uTime * (0.6 + aSeed * 0.8);
    vec3 p = position + aVelocity * uTime;
    p.y -= uGravity * uTime;
    // Lateral sway (petals / fireflies)
    p.x += sin(t * 1.3 + aSeed * 6.28) * uSway;
    p.z += cos(t * 0.9 + aSeed * 3.14) * uSway;
    // Wrap inside the bounding box around the centre
    vec3 halfBounds = uBounds * 0.5;
    vec3 rel = p - uCenter + halfBounds;
    rel = mod(rel, uBounds);
    p = rel - halfBounds + uCenter;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = mix(1.0, 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * (2.0 + aSeed * 3.0) + aSeed * 40.0)), uTwinkle);
    // Fade near the wrap edges so particles don't pop
    vec3 edge = abs(rel - halfBounds) / halfBounds;
    float edgeFade = 1.0 - smoothstep(0.75, 1.0, max(edge.x, max(edge.y, edge.z)));
    vAlpha = twinkle * edgeFade;
    gl_PointSize = aSize * uScale * uPixelRatio * (260.0 / max(-mv.z, 0.5));
    gl_Position = projectionMatrix * mv;
  }
`;

export const particleFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uSpin;
  uniform float uTime;
  varying float vAlpha;
  varying float vSeed;
  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float angle = uSpin * (uTime * (0.8 + vSeed) + vSeed * 6.28);
    float c = cos(angle);
    float s = sin(angle);
    uv = mat2(c, -s, s, c) * uv + 0.5;
    vec4 tex = texture2D(uMap, uv);
    float a = tex.a * vAlpha * uOpacity;
    if (a < 0.01) discard;
    gl_FragColor = vec4(tex.rgb * vColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
