/*
 * The wordmark wall: the orange poster's repeated CLUB CASA, as a live surface. Rows are staggered like the
 * print, drift slowly in alternating directions, ripple gently, and swell around the pointer. Three warm lamps
 * breathe across it — slow fades in and out, never a flash, as the concept deck asks of the room's lighting.
 */

export const wallVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  // A 2 x 2 plane already spans clip space, so it covers the screen whatever the camera does.
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const wallFragment = /* glsl */ `
precision highp float;

uniform sampler2D uTile;
uniform float uTileAspect;
uniform float uRowHeight;
uniform float uTime;
uniform float uLampTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uLens;
uniform vec3 uBase;
uniform vec3 uPattern;
uniform float uOpacity;
uniform vec3 uGlow;
uniform float uGlowStrength;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n * 91.345) * 47453.21);
}

float hash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}

// A lamp: a soft pool of light that breathes between dim and full over several seconds.
float lamp(vec2 uv, vec2 position, float radius, float phase, float aspect) {
  vec2 d = (uv - position) * vec2(aspect, 1.0);
  float falloff = exp(-dot(d, d) / (radius * radius));
  float breath = 0.5 + 0.5 * sin(uLampTime * 0.62 + phase);
  return falloff * (0.45 + 0.55 * breath * breath);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);

  // Work in pixels from the centre, tilted a few degrees like a hand-pasted poster.
  float angle = -0.06;
  mat2 tilt = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 p = tilt * ((vUv - 0.5) * uResolution);

  // Lettering near the pointer swells outwards, as if under a loupe.
  vec2 toPointer = p - tilt * (uPointer * 0.5 * uResolution);
  float radius = uRowHeight * 2.4;
  float lens = exp(-dot(toPointer, toPointer) / (2.0 * radius * radius)) * uLens;
  p -= toPointer * lens * 0.22;

  float row = floor(p.y / uRowHeight);
  float direction = mod(row, 2.0) < 1.0 ? 1.0 : -1.0;
  float speed = (0.5 + hash(row) * 0.6) * direction;
  // Half a tile per row plus a little randomness, like the poster's loose stagger.
  float stagger = row * 0.5 + hash(row + 17.0) * 0.35;

  vec2 uv = vec2(p.x / (uRowHeight * uTileAspect) + stagger + uTime * 0.018 * speed, p.y / uRowHeight);
  uv.y += sin(uv.x * 1.7 + uTime * 0.4 + row * 1.3) * 0.03;

  float ink = texture2D(uTile, uv).a;
  // Uneven print density across the sheet.
  float density = 0.82 + 0.18 * hash(row * 3.1 + floor(uv.x));
  vec3 color = mix(uBase, uPattern, ink * uOpacity * density);

  // Slightly dirty rather than polished: a low, mottled unevenness like a well-used print.
  float mottle = noise(vUv * vec2(aspect, 1.0) * 3.5) * 0.6 + noise(vUv * vec2(aspect, 1.0) * 11.0) * 0.4;
  color *= 0.94 + 0.06 * mottle;

  // Three lamps placed off-centre, each breathing on its own slow cycle.
  float light = lamp(vUv, vec2(0.16, 0.74), 0.42, 0.0, aspect)
              + lamp(vUv, vec2(0.86, 0.36), 0.48, 2.1, aspect)
              + lamp(vUv, vec2(0.46, 0.04), 0.38, 4.2, aspect);
  color += uGlow * light * uGlowStrength;

  // A soft vignette keeps the edges moody and the centre readable.
  vec2 v = (vUv - 0.5) * vec2(aspect, 1.0);
  color *= 1.0 - 0.28 * smoothstep(0.35, 1.1, length(v));

  gl_FragColor = vec4(color, 1.0);
}
`
