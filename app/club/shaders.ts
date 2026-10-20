/*
 * GLSL for the club (GLSL ES 3.00; three.js adds the #version line). Everything works in CSS pixels with the origin
 * at the top left, like the page, so the door, the pointer and the scroll all line up without conversion.
 *
 * The room is drawn behind the page: the lights go down over the wordmark wall, except where something lights it.
 * The crowd, the conga line, the mirror ball's specks and the confetti are drawn in front.
 *
 * Every colour is from the brand's four (or that colour with less light on it). Output is premultiplied alpha.
 */

const COMMON = /* glsl */ `
const vec3 ORANGE = vec3(0.914, 0.369, 0.153);
const vec3 CHARCOAL = vec3(0.129);
const vec3 STONE = vec3(0.8, 0.776, 0.729);
const vec3 CREAM = vec3(0.929, 0.882, 0.827);
/** Charcoal with the lights down. */
const vec3 DARK = CHARCOAL * 0.42;
/** Where each character's feet sit in its cell of the sprite sheet (y = 244 of 256). */
const float FLOOR_V = 0.953;

/** The crowd's colours, and the outline each wears. */
const vec3 TINTS[4] = vec3[4](ORANGE, CREAM, STONE, CHARCOAL * 1.15);
const vec3 EDGES[4] = vec3[4](CHARCOAL, CHARCOAL, CHARCOAL, ORANGE);

float hash21(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 hash22(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}

/** Where a sprite-sheet cell starts (0–1). The sheet is 4 x 4. */
vec2 cellOrigin(float cell) {
  return vec2(mod(cell, 4.0), floor(cell / 4.0 + 0.01)) * 0.25;
}
`

const LIGHTS = /* glsl */ `
uniform vec2 uRes;
/** The moving heads along the ceiling: x (px), aim (radians, 0 is straight down), strength, spread (radians). */
uniform vec4 uBeams[6];
uniform vec3 uBeamTints[6];
/** The follow-spot on the pointer: x, y (px), strength. */
uniform vec3 uSpot;

float beamAt(vec2 p, vec4 beam) {
  vec2 d = p - vec2(beam.x, -70.0);
  float reach = length(d);
  float off = abs(atan(d.x, d.y) - beam.y);
  float spread = beam.w * (0.7 + 0.6 * clamp(reach / uRes.y, 0.0, 1.5));
  return smoothstep(spread, spread * 0.2, off) * beam.z / (1.0 + reach * reach * 6e-7);
}

/** The light falling on point p: its colour (summed), and how strong it is in total. */
vec3 lightAt(vec2 p, out float strength) {
  vec3 colour = vec3(0.0);
  strength = 0.0;
  for (int i = 0; i < 6; i++) {
    float s = beamAt(p, uBeams[i]);
    colour += uBeamTints[i] * s;
    strength += s;
  }
  float spot = uSpot.z * smoothstep(230.0, 20.0, distance(p, uSpot.xy));
  colour += CREAM * spot;
  strength += spot;
  return colour;
}
`

/** A triangle that covers the screen, for the room. */
export const roomVertex = /* glsl */ `
precision highp float;
in vec3 position;
uniform vec2 uRes;
out vec2 vPixel;

void main() {
  vPixel = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5) * uRes;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const roomFragment = /* glsl */ `
precision highp float;
${COMMON}
${LIGHTS}
in vec2 vPixel;
out vec4 fragColor;

uniform sampler2D uSheet;
uniform float uTime;
uniform float uBeat;
uniform float uEnergy;
uniform float uDrop;
uniform float uClub;
/** How far the mirror ball has turned, and how much it's lit (0 until it's down). */
uniform float uSpin;
uniform float uBall;
/** Casa-shaped gobos sweeping the walls: x, y, size (px), rotation; and cell, strength, orange (0–1). */
uniform vec4 uGobos[3];
uniform vec3 uGoboLooks[3];

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), u.x), u.y);
}

float haze(vec2 p) {
  return 0.5 * noise(p) + 0.3 * noise(p * 2.07 + 13.1) + 0.2 * noise(p * 4.13 + 7.7);
}

/** One channel of a cell of the sprite sheet, at uv across the cell (0–1, y down); 0 outside it. */
float sheet(float cell, vec2 uv, float lod, int channel) {
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
  return textureLod(uSheet, cellOrigin(cell) + uv * 0.25, lod)[channel];
}

void main() {
  vec2 p = vPixel;
  float strength;
  vec3 colour = lightAt(p, strength);

  // Smoke drifting through the beams.
  float smoke = 0.5 + 0.5 * haze(p * 0.0045 + vec2(uTime * 0.03, -uTime * 0.021));
  colour *= smoke;
  strength *= smoke;

  // Gobos: Casa and friends, thrown as soft light across the walls.
  for (int i = 0; i < 3; i++) {
    vec4 gobo = uGobos[i];
    vec3 look = uGoboLooks[i];
    vec2 local = p - gobo.xy;
    float c = cos(gobo.w);
    float s = sin(gobo.w);
    local = mat2(c, -s, s, c) * local / gobo.z + vec2(0.5, 0.55);
    float light = sheet(look.x, local, 2.0, 2) * look.y;
    colour += mix(CREAM, ORANGE, look.z) * light;
    strength += light;
  }

  // The mirror ball's specks, wheeling round the room.
  vec2 q = p / 30.0;
  q.x += uSpin * (1.0 + 0.35 * sin(q.y * 0.21));
  vec2 cell = floor(q);
  vec2 jitter = hash22(cell) - 0.5;
  float twinkle = 0.55 + 0.45 * sin(uTime * 2.6 + hash21(cell) * 6.283);
  float speck = step(0.62, hash21(cell + 4.1)) * twinkle * smoothstep(0.17, 0.05, length(fract(q) - 0.5 - jitter * 0.55));
  colour += CREAM * speck * uBall;
  strength += speck * uBall;

  // Warm light off the dance floor, and the drop lifting the whole room for a moment.
  float floorGlow = smoothstep(uRes.y * 0.45, uRes.y * 1.05, p.y) * (0.2 + 0.22 * uEnergy) + uDrop * 0.3;
  colour += ORANGE * floorGlow;
  strength += floorGlow;

  // Lights down: dark everywhere, except where the light lands, which shows the wall through, warmed by its colour.
  vec2 uv = p / uRes;
  float vignette = smoothstep(0.35, 0.95, length((uv - 0.5) * vec2(1.0, 1.25)));
  float lit = clamp(strength, 0.0, 1.5);
  float dark = uClub * (0.86 + 0.1 * vignette) * (1.0 - clamp(lit * 0.82, 0.0, 0.9));
  float glow = clamp(lit, 0.0, 1.0) * 0.5 * uClub;
  vec4 room = vec4(DARK * dark + colour / max(strength, 1e-3) * glow, dark + glow);

  fragColor = room;
}
`

/** The crowd on the dance floor, and the flood of them through the door. */
export const crowdVertex = /* glsl */ `
precision highp float;
precision highp int;
${COMMON}
${LIGHTS}
in vec3 position;
/** Across the floor (0–1), depth (0 at the back, 1 at the front), beat offset, size. */
in vec4 aHome;
/** Sprite-sheet cell, tint, facing (-1 or 1), and when it comes through the door (0–1 of the door's swing). */
in vec4 aLook;
/** How high its arc out of the door goes, its spin on the way, how bouncy it is, where in the doorway it comes from. */
in vec4 aMove;

uniform float uBeat;
uniform float uEnergy;
uniform float uFill;
uniform float uDrop;
uniform float uSink;
uniform float uClub;
uniform float uFloor;
uniform vec2 uSizes;
uniform vec2 uDoor;
/** x, y (px), how close to the floor it is (0–1), and whether there's a pointer at all (0–1). */
uniform vec4 uPointer;
/** Where each band of rows has got to, following the pointer: the front catches up first. */
uniform float uFollow[6];
/** The doorway's x (px), and how much room to leave in front of it (0 once the door's scrolled up out of the way). */
uniform vec2 uWalkway;

out vec2 vUv;
out float vCell;
out vec3 vColour;
out vec3 vEdge;
out float vAlpha;

void main() {
  float depth = aHome.y;
  float size = mix(uSizes.x, uSizes.y, pow(depth, 1.6)) * (0.84 + 0.32 * aHome.w);
  float margin = uSizes.y * 0.35;
  float homeX = aHome.x * (uRes.x + 2.0 * margin) - margin;
  float feetY = uRes.y - uFloor + uFloor * pow(depth, 0.9) + size * 0.28 * depth;

  int band = int(min(depth * 6.0, 5.0));
  float x = homeX + clamp((uFollow[band] - homeX) * 0.08, -44.0, 44.0) * uPointer.w * (0.45 + 0.55 * depth);
  float fromDoor = x - uWalkway.x;
  x += sign(fromDoor) * uWalkway.y * smoothstep(150.0, 0.0, abs(fromDoor)) * 110.0;

  // The dance: a hop on every beat, a stepped waddle like Casa's walk, a squash on landing. They reach up for the
  // pointer when it comes near the floor, and everyone goes up on the drop.
  float t = fract(uBeat + aHome.z * 0.24);
  float hop = 4.0 * t * (1.0 - t);
  float energy = uEnergy * (0.55 + 0.9 * aMove.z);
  float lift = size * hop * (0.03 + 0.22 * energy);
  lift += size * 0.5 * uPointer.z * uPointer.w * exp(-pow((x - uPointer.x) / 160.0, 2.0));
  lift += size * 0.8 * uDrop * (0.55 + 0.45 * aMove.z);
  float side = mod(floor(uBeat + aHome.z * 2.0), 2.0) * 2.0 - 1.0;
  float tilt = side * radians(2.0 + 7.0 * uEnergy);
  float land = pow(1.0 - hop, 8.0) * energy;
  vec2 squash = vec2(1.0 + 0.1 * land, 1.0 - 0.13 * land);
  vec2 feet = vec2(x, feetY - lift);

  // Through the door: out of the doorway, up and over, down onto its spot.
  float flight = clamp((uFill - aLook.w) / 0.16, 0.0, 1.0);
  if (flight <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float eased = 1.0 - pow(1.0 - flight, 2.2);
  vec2 from = uDoor + vec2((aMove.w - 0.5) * 36.0, 0.0);
  vec2 over = mix(from, feet, 0.5) - vec2(0.0, 120.0 + 420.0 * aMove.x);
  vec2 at = mix(mix(from, over, eased), mix(over, feet, eased), eased);
  float spin = (1.0 - eased) * aMove.y * 9.0;
  float grow = mix(0.3, 1.0, eased);

  // Lights on, with the door out of sight: everyone ducks out of view instead.
  float sink = clamp((uSink - aHome.z * 0.3) / 0.7, 0.0, 1.0);
  at.y += sink * sink * (size + 90.0);

  vec2 corner = (position.xy - vec2(0.0, FLOOR_V)) * size * grow * squash;
  corner.x *= aLook.z;
  float angle = tilt * eased + spin;
  float c = cos(angle);
  float s = sin(angle);
  corner = vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
  vec2 pixel = at + corner;
  gl_Position = vec4(pixel / uRes * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);

  vUv = vec2(position.x + 0.5, position.y);
  vCell = aLook.x;
  int tint = int(aLook.y + 0.5);
  float strength;
  lightAt(at - vec2(0.0, size * 0.45), strength);
  // The back rows fade into the dark, a sea of them; the front rows are bright, and the beams pick people out.
  float shade = mix(1.0, mix(0.16, 1.0, pow(depth, 0.85)), uClub);
  vec3 body = TINTS[tint] * (shade * (0.66 + 0.1 * uEnergy) + min(strength, 1.2) * 0.55 * (0.4 + 0.6 * depth) + uDrop * 0.3);
  vColour = mix(DARK * 1.2, body, mix(1.0, 0.25 + 0.75 * pow(depth, 0.8), uClub));
  vEdge = EDGES[tint] * mix(1.0, 0.35 + 0.65 * depth, uClub);
  vAlpha = 1.0;
}
`

/** The conga line: placed from the CPU each frame. */
export const congaVertex = /* glsl */ `
precision highp float;
precision highp int;
${COMMON}
${LIGHTS}
in vec3 position;
/** The feet (px), size (px), rotation. */
in vec4 aPlace;
/** Sprite-sheet cell, tint, facing (-1 or 1), opacity. */
in vec4 aLook;

out vec2 vUv;
out float vCell;
out vec3 vColour;
out vec3 vEdge;
out float vAlpha;

void main() {
  vec2 corner = (position.xy - vec2(0.0, FLOOR_V)) * aPlace.z;
  corner.x *= aLook.z;
  float c = cos(aPlace.w);
  float s = sin(aPlace.w);
  corner = vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
  vec2 pixel = aPlace.xy + corner;
  gl_Position = vec4(pixel / uRes * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);

  vUv = vec2(position.x + 0.5, position.y);
  vCell = aLook.x;
  int tint = int(aLook.y + 0.5);
  float strength;
  lightAt(aPlace.xy - vec2(0.0, aPlace.z * 0.45), strength);
  vColour = TINTS[tint] * (0.9 + min(strength, 1.0) * 0.25);
  vEdge = EDGES[tint];
  vAlpha = aLook.w;
}
`

/** One read of the sprite sheet: blue is the character, red the character with its outline. */
export const spriteFragment = /* glsl */ `
precision highp float;
${COMMON}
in vec2 vUv;
in float vCell;
in vec3 vColour;
in vec3 vEdge;
in float vAlpha;
uniform sampler2D uSheet;
out vec4 fragColor;

void main() {
  vec4 texel = texture(uSheet, cellOrigin(vCell) + clamp(vUv, 0.004, 0.996) * 0.25);
  float body = texel.b;
  float edge = clamp(texel.r - body, 0.0, 1.0);
  float alpha = clamp(body + edge, 0.0, 1.0) * vAlpha;
  if (alpha < 0.003) discard;
  fragColor = vec4((vColour * body + vEdge * edge) * vAlpha, alpha);
}
`

/** The mirror ball's specks sliding over everything, and the confetti on a drop. Positions come from the seeds. */
export const particleVertex = /* glsl */ `
precision highp float;
${COMMON}
in vec3 position;
in vec4 aSeed;
/** 0 for a speck, 1 for confetti. */
in float aKind;
uniform vec2 uRes;
uniform float uTime;
uniform float uSpin;
uniform float uBall;
/** Seconds since the confetti went up (large when there's none). */
uniform float uBurst;

out vec2 vUv;
out vec3 vColour;
out float vAlpha;
out float vKind;

void main() {
  vec2 centre;
  vec2 size;
  float angle = 0.0;
  vKind = aKind;
  if (aKind < 0.5) {
    centre.x = mod(aSeed.x * (uRes.x + 80.0) + uSpin * (60.0 + 120.0 * aSeed.z), uRes.x + 80.0) - 40.0;
    centre.y = (0.08 + 0.78 * aSeed.y) * uRes.y + sin(uTime * 0.6 + aSeed.w * 6.283) * 8.0;
    size = vec2(3.0 + 5.0 * aSeed.z);
    vColour = CREAM;
    vAlpha = uBall * (0.16 + 0.2 * (0.5 + 0.5 * sin(uTime * 3.1 + aSeed.w * 40.0)));
  } else {
    float t = uBurst - aSeed.w * 0.25;
    if (t < 0.0 || t > 2.8) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
    vec2 from = vec2(aSeed.x * uRes.x, uRes.y + 12.0);
    vec2 velocity = vec2((aSeed.z - 0.5) * 380.0, -(560.0 + 520.0 * aSeed.y));
    centre = from + velocity * t + vec2(sin(t * 7.0 + aSeed.x * 30.0) * 14.0, 760.0 * t * t * 0.5);
    size = vec2(9.0, 4.5);
    angle = t * (aSeed.z - 0.5) * 18.0;
    float pick = fract(aSeed.w * 7.0);
    vColour = pick < 0.45 ? ORANGE : pick < 0.8 ? CREAM : STONE;
    vAlpha = 1.0 - smoothstep(2.0, 2.8, t);
  }
  vec2 corner = position.xy * size;
  float c = cos(angle);
  float s = sin(angle);
  corner = vec2(c * corner.x - s * corner.y, s * corner.x + c * corner.y);
  vec2 pixel = centre + corner;
  gl_Position = vec4(pixel / uRes * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
  vUv = position.xy + 0.5;
}
`

export const particleFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
in vec3 vColour;
in float vAlpha;
in float vKind;
out vec4 fragColor;

void main() {
  float shape = vKind < 0.5 ? smoothstep(0.5, 0.0, length(vUv - 0.5)) : 1.0;
  float alpha = shape * vAlpha;
  if (alpha < 0.003) discard;
  fragColor = vec4(vColour * alpha, alpha);
}
`
