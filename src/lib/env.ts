// Shared scene environment with a fast day/night cycle.
//
// These Color/Vector3 objects are mutated in place by updateSky() every frame.
// Every material's uniform holds a *reference* to one of them, so mutating here
// updates the whole scene automatically (three re-uploads uniforms each frame).
import { Color, Vector3 } from 'three';

// --- key light (sun by day, moon by night) used by terrain/grass/water ---
export const SUN_DIR = new Vector3(0.48, 0.5, 0.3).normalize();
export const SUN_COLOR = new Color('#ffe6bc'); // premultiplied key colour

// --- sky / fog ---
export const SKY_ZENITH = new Color('#4f83c8');
export const SKY_HORIZON = new Color('#dbe4e2');
export const FOG_COLOR = new Color('#dbe4e2');
export const FOG_DENSITY = 0.0012;

// --- actual celestial bodies (for the sky shader: discs + lighting) ---
export const SUN_DISK_DIR = new Vector3(0.48, 0.5, 0.3).normalize();
export const MOON_DIR = new Vector3(-0.48, -0.5, 0.3).normalize();
export const SUN_DISK_COLOR = new Color('#fff1d5');
export const MOON_COLOR = new Color('#cdd6ff');

// --- cloud layer bands (world Y) ---
export const CLOUD_BOTTOM = 220.0;
export const CLOUD_TOP = 420.0;
export const LOW_CLOUD_BOTTOM = 55.0;
export const LOW_CLOUD_TOP = 130.0;

// scalar state read by components/Scene each frame
export const sky = {
  night: 0,
  ambient: 1,
  keyIntensity: 2.6,
  hemiIntensity: 1.1,
  lightColor: new Color('#ffe6bc')
};

// palette
const ZEN_DAY = new Color('#5a83bf');
const ZEN_NIGHT = new Color('#0a1638');
const HOR_DAY = new Color('#e7e2cf'); // warm hazy horizon
const HOR_NIGHT = new Color('#1a2348');
const SUNSET = new Color('#ff8a45');
const KEY_DAY = new Color(1.0, 0.88, 0.68); // warmer midday sun
const KEY_MOON = new Color(0.34, 0.42, 0.6);
const KEY_SUNSET = new Color(1.0, 0.6, 0.35);

const _sun = new Vector3();
const _moon = new Vector3();
const ss = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export const CYCLE_SECONDS = 120;

/** Advance the sky to absolute time `t` (seconds). One full cycle per CYCLE_SECONDS. */
export function updateSky(t: number) {
  const a = ((t % CYCLE_SECONDS) / CYCLE_SECONDS) * Math.PI * 2;
  const se = Math.sin(a);

  _sun.set(0.7 * Math.cos(a), se, 0.4).normalize();
  _moon.set(-0.7 * Math.cos(a), -se, 0.4).normalize();

  const day = ss(-0.06, 0.22, se);
  const night = 1 - day;
  const moonUp = ss(-0.02, 0.2, -se);
  const tw = Math.exp(-((se / 0.16) ** 2)); // twilight peak at the horizon

  SKY_ZENITH.copy(ZEN_NIGHT).lerp(ZEN_DAY, day);
  SKY_HORIZON.copy(HOR_NIGHT).lerp(HOR_DAY, day).lerp(SUNSET, tw * 0.6);
  FOG_COLOR.copy(SKY_HORIZON);

  // key light: comes from the sun by day, the moon by night
  SUN_DIR.copy(_moon).lerp(_sun, day).normalize();
  sky.lightColor.copy(KEY_MOON).lerp(KEY_DAY, day).lerp(KEY_SUNSET, tw * 0.5);
  const keyBright = day + 0.4 * night * moonUp + tw * 0.15;
  SUN_COLOR.copy(sky.lightColor).multiplyScalar(keyBright);

  SUN_DISK_DIR.copy(_sun);
  MOON_DIR.copy(_moon);

  sky.night = night;
  sky.ambient = 0.22 + 0.58 * day; // softer, less blown-out midday
  sky.keyIntensity = 1.9 * day + 1.2 * night * moonUp;
  sky.hemiIntensity = 0.22 + 0.68 * day;
}

// Shared GLSL fog helper matching three's FogExp2.
export const fogGLSL = /* glsl */ `
uniform vec3 uFogColor;
uniform float uFogDensity;
vec3 applyFog(vec3 color, float dist) {
  float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  return mix(color, uFogColor, clamp(f, 0.0, 1.0));
}
`;
