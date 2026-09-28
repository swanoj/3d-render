/*
 * The CRT picture: curved glass, scanlines, an aperture grille, a little colour fringing, a slow rolling band and
 * a static burst between channels. Nothing strobes: the brightest moment is the power-on line opening once.
 * Works in linear colour (the channel texture is tagged sRGB) and converts on output, so it sits correctly in
 * the post-processed scene. On Casa Cam the channel texture is only captions, laid over the security camera's
 * picture of the room.
 */

export const screenVertex = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const screenFragment = /* glsl */ `
precision highp float;

uniform sampler2D uContent;
uniform float uTime;
uniform float uStatic;
uniform float uPower;
// Above 1 so the brightest parts of the picture glow (bloom) like a real tube.
uniform float uBoost;
// Casa Cam: the camera's picture of the room (linear, unclamped), and 1 while that channel is on.
uniform sampler2D uCam;
uniform float uCamMix;

varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// A cheap security camera: black and white with a green cast, and shadows lifted.
float camLuma(vec2 p) {
  vec3 c = texture2D(uCam, p).rgb;
  c = c / (1.0 + c);
  return pow(dot(c, vec3(0.299, 0.587, 0.114)), 0.75) * 1.3;
}

// Curved glass: the picture bows outward toward the corners.
vec2 barrel(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + 0.045 * dot(c, c);
  return c * 0.5 + 0.5;
}

// A periodic darkening (scanlines, the grille) that fades out wherever its lines would be closer together than the
// pixels drawing them, which is what turns them into moire on a small or distant screen.
float lines(float coord, float count, float depth) {
  float resolved = clamp(1.0 - fwidth(coord) * count * 2.2, 0.0, 1.0);
  return 1.0 - depth * resolved * (0.5 - 0.5 * cos(coord * 6.2831853 * count));
}

// The rounded-rectangle opening of an old tube.
float tubeMask(vec2 uv) {
  vec2 q = abs(uv - 0.5) * 2.0;
  vec2 r = vec2(0.13, 0.17);
  vec2 d = max(q - (1.0 - r), 0.0) / r;
  return 1.0 - smoothstep(0.92, 1.0, length(d));
}

void main() {
  vec2 uv = barrel(vUv);
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0) * tubeMask(uv);

  // Power on: the picture opens vertically out of a bright horizontal line.
  float open = smoothstep(0.0, 0.75, uPower);
  float vy = (uv.y - 0.5) / max(open, 0.001) + 0.5;
  float line = (1.0 - smoothstep(0.0, 0.015, abs(uv.y - 0.5))) * (1.0 - open) * step(0.001, uPower);

  // Between channels the rows slip sideways and snow takes over.
  float jitter = (rand(vec2(floor(uv.y * 140.0), floor(uTime * 24.0))) - 0.5) * 0.035 * uStatic;
  vec2 picture = vec2(uv.x + jitter, vy);
  float fringe = 0.0014 + 0.006 * uStatic;
  vec4 content = texture2D(uContent, picture);
  vec3 color = vec3(
    texture2D(uContent, picture + vec2(fringe, 0.0)).r,
    content.g,
    texture2D(uContent, picture - vec2(fringe, 0.0)).b
  );

  if (uCamMix > 0.5) {
    vec3 feed = vec3(camLuma(picture + vec2(fringe, 0.0)), camLuma(picture), camLuma(picture - vec2(fringe, 0.0)));
    feed *= vec3(0.8, 1.0, 0.88);
    feed += (rand(floor(picture * vec2(320.0, 240.0)) + fract(uTime * 11.0)) - 0.5) * 0.08;
    color = mix(feed, color, content.a);
  }

  float snow = rand(uv * vec2(420.0, 320.0) + fract(uTime * 7.3));
  color = mix(color, vec3(snow * 0.85), uStatic * 0.85);

  // Scanlines, the phosphor grille and a slow drifting band.
  color *= lines(uv.y, 150.0, 0.32);
  color *= lines(uv.x, 300.0, 0.14);
  color *= 0.95 + 0.05 * sin((uv.y + uTime * 0.07) * 6.2831);
  color += (snow - 0.5) * 0.035;

  vec2 fromCentre = uv - 0.5;
  color *= 1.0 - dot(fromCentre, fromCentre) * 1.25;
  color *= 1.2;

  float shown = step(abs(vy - 0.5), 0.5) * step(0.001, uPower);
  color = color * shown + vec3(1.0, 0.93, 0.86) * line * 1.4;

  // Reflection on the glass.
  color += vec3(1.0, 0.95, 0.9) * 0.05 * smoothstep(0.5, 0.0, length(vUv - vec2(0.27, 0.8)));

  gl_FragColor = vec4(color * inside * uBoost, 1.0);
  #include <colorspace_fragment>
}
`
