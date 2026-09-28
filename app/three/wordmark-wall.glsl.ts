/*
 * The wordmark wall: the orange poster's repeated CLUB CASA, as a live surface. Rows are staggered like the
 * print, drift slowly in alternating directions, ripple gently, and swell around the pointer. The tile texture
 * repeats in both directions, so every row reads from the same logo drawing.
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
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uLens;
uniform vec3 uBase;
uniform vec3 uPattern;
uniform float uOpacity;

varying vec2 vUv;

float hash(float n) {
  return fract(sin(n * 91.345) * 47453.21);
}

void main() {
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
  gl_FragColor = vec4(mix(uBase, uPattern, ink * uOpacity * density), 1.0);
}
`
