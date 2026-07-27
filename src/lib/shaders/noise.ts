// Shared procedural noise + the fixed-map height field.
//
// The SAME height function exists in GLSL (GPU-displaced terrain + grass) and in
// JS (CPU tree/grass placement). Both are generated here so they can never drift
// apart. The map is a large meadow with a meandering river running through a
// valley between two flanking ridges. Distant mountains are a separate backdrop.

// --- map geometry constants (used by several components) ---
export const MAP_HALF = 1000; // terrain plane half-size (world units)
export const WATER_LEVEL = -11; // river water surface height
export const MEADOW_R = 680; // grass/trees/rocks only inside this radius (before the mountains)
export const GRASS_MAX_H = 42; // no grass above this height (mountain feet)

// --- GLSL ------------------------------------------------------------------
export const noiseGLSL = /* glsl */ `
// Precision-stable hash (Dave Hoskins): no sin(), early fract() keeps every
// intermediate small so 32-bit GPU and 64-bit JS agree closely.
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * valueNoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// River centreline (meanders gently along the X axis across the big map).
float riverCentre(float x) {
  return sin(x * 0.006) * 90.0 + sin(x * 0.02 + 1.3) * 24.0;
}

// Fixed-map terrain height. p = world (x, z).
float terrainHeight(vec2 p) {
  float dRiver = abs(p.y - riverCentre(p.x));

  float hills = (fbm(p * 0.006) - 0.5) * 24.0; // broad rolling hills
  float detail = (fbm(p * 0.022) - 0.5) * 4.0; // small variation

  float valley = smoothstep(180.0, 28.0, dRiver); // low corridor
  float bed = smoothstep(30.0, 5.0, dRiver);      // carved river bed
  float flank = exp(-pow((dRiver - 100.0) / 60.0, 2.0)) * 20.0; // ridge each side

  float h = hills * (1.0 - 0.55 * valley) + detail;
  h += flank * (1.0 - 0.35 * valley);
  h -= valley * 13.0;
  h -= bed * 10.0;

  // mountain rim ringing the map
  float rim = smoothstep(680.0, 980.0, length(p));
  h += rim * (70.0 + fbm(p * 0.009) * 180.0 + fbm(p * 0.03) * 70.0);

  return h;
}
`;

// --- JS mirror -------------------------------------------------------------
const fract = (x: number) => x - Math.floor(x);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function hash21(x: number, z: number): number {
  let p3x = fract(x * 0.1031);
  let p3y = fract(z * 0.1031);
  const p3z = p3x;
  const d = p3x * (p3y + 33.33) + p3y * (p3z + 33.33) + p3z * (p3x + 33.33);
  p3x += d;
  p3y += d;
  return fract((p3x + p3y) * (p3z + d));
}

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash21(ix, iz);
  const b = hash21(ix + 1, iz);
  const c = hash21(ix, iz + 1);
  const d = hash21(ix + 1, iz + 1);
  return mix(mix(a, b, ux), mix(c, d, ux), uz);
}

function fbm(x: number, z: number): number {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < 5; i++) {
    v += a * valueNoise(x, z);
    x *= 2;
    z *= 2;
    a *= 0.5;
  }
  return v;
}

export function riverCentre(x: number): number {
  return Math.sin(x * 0.006) * 90 + Math.sin(x * 0.02 + 1.3) * 24;
}

/** CPU mirror of the GLSL terrainHeight(). */
export function terrainHeight(x: number, z: number): number {
  const dRiver = Math.abs(z - riverCentre(x));

  const hills = (fbm(x * 0.006, z * 0.006) - 0.5) * 24;
  const detail = (fbm(x * 0.022, z * 0.022) - 0.5) * 4;

  const valley = smoothstep(180, 28, dRiver);
  const bed = smoothstep(30, 5, dRiver);
  const flank = Math.exp(-Math.pow((dRiver - 100) / 60, 2)) * 20;

  let h = hills * (1 - 0.55 * valley) + detail;
  h += flank * (1 - 0.35 * valley);
  h -= valley * 13;
  h -= bed * 10;

  const rim = smoothstep(680, 980, Math.hypot(x, z));
  h += rim * (70 + fbm(x * 0.009, z * 0.009) * 180 + fbm(x * 0.03, z * 0.03) * 70);

  return h;
}
