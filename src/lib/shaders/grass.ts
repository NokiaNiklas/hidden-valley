import { noiseGLSL, GRASS_MAX_H, WATER_LEVEL, MEADOW_R } from './noise';
import { fogGLSL } from '../env';

export const grassVertex = /* glsl */ `
${noiseGLSL}

attribute vec2 aOffset;   // grid position in patch-local space (multiples of spacing)

uniform float uTime;
uniform vec2  uCamXZ;
uniform vec2  uCamDir;     // camera forward (XZ) for view-cone culling
uniform float uSpacing;
uniform float uInner;      // annulus inner radius (0 for the innermost LOD)
uniform float uOuter;      // annulus outer radius
uniform float uBladeWidth; // width multiplier (wider for coarser far LODs)
uniform float uHeightMul;
uniform float uFlowers;    // 1 on near LODs, 0 on far LODs

varying float vHeightFrac;
varying float vColorVar;
varying vec3  vWorldPos;
varying float vWind;
varying float vFlower;

void main() {
  vec2 snapped = floor(uCamXZ / uSpacing + 0.5) * uSpacing;
  vec2 cell = snapped + aOffset;

  float rnd = hash21(cell);
  float rnd2 = hash21(cell + 7.3);
  vec2 jitter = (vec2(hash21(cell + 1.7), hash21(cell + 3.1)) - 0.5) * uSpacing;
  vec2 worldXZ = cell + jitter;

  float groundY = terrainHeight(worldXZ);

  // LOD annulus: fade in at the inner edge, out at the outer edge.
  float rad = length(aOffset);
  float innerFade = uInner > 0.0 ? smoothstep(uInner * 0.55, uInner, rad) : 1.0;
  float outerFade = 1.0 - smoothstep(uOuter * 0.78, uOuter, rad);
  float ring = innerFade * outerFade;

  // Clip to the meadow: none outside the map, on mountains, or in the river.
  float mapFade =
      (1.0 - smoothstep(${MEADOW_R.toFixed(1)} * 0.92, ${MEADOW_R.toFixed(1)}, length(worldXZ)))
    * (1.0 - smoothstep(${(GRASS_MAX_H - 6).toFixed(1)}, ${GRASS_MAX_H.toFixed(1)}, groundY))
    * smoothstep(${(WATER_LEVEL + 0.5).toFixed(1)}, ${(WATER_LEVEL + 3.0).toFixed(1)}, groundY);

  vFlower = step(0.965, hash21(cell + 13.7)) * uFlowers;

  // camera-forward culling: collapse far blades outside the view cone (perf)
  vec2 toB = worldXZ - uCamXZ;
  float distB = length(toB);
  float infront = dot(toB / max(distB, 0.001), uCamDir);
  float cull = (distB > 16.0 && infront < 0.1) ? 0.0 : 1.0;

  float bladeH = (0.55 + 0.9 * rnd2) * ring * mapFade * uHeightMul * (1.0 + vFlower * 0.25) * cull;
  float visible = step(0.02, bladeH);

  float hf = position.y;
  vHeightFrac = hf;
  vColorVar = rnd;

  float ang = rnd * 6.2831853;
  float ca = cos(ang), sa = sin(ang);
  float lx = position.x * (0.9 + 0.4 * rnd2) * uBladeWidth * visible;
  vec2 rot = vec2(lx * ca, lx * sa);

  // Wind, stronger toward the tip:
  //  - gusts that sweep across the whole field every few seconds
  //  - a light idle sway + small irregular flutter so blades never stand still
  vec2 windDir = normalize(vec2(0.8, 0.35));
  // Patchy gusts: moving blobs of wind so only some batches sway at a time.
  float gustField = fbm(worldXZ * 0.02 + uTime * 0.12 * windDir);
  float gust = smoothstep(0.55, 0.82, gustField);
  float idle = 0.18 + 0.1 * sin(uTime * 1.1 + rnd * 6.2831);
  float flutter = (fbm(worldXZ * 0.2 + uTime * 0.5) - 0.5) * 0.4;
  float amp = idle + flutter + gust * 2.1;
  float bend = amp * pow(hf, 1.5) * bladeH * visible;
  vWind = gust;

  vec3 world;
  world.x = worldXZ.x + rot.x + windDir.x * bend;
  world.z = worldXZ.y + rot.y + windDir.y * bend;
  world.y = groundY + hf * bladeH * 1.5 - (1.0 - visible) * 100.0;

  vWorldPos = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const grassFragment = /* glsl */ `
precision highp float;

${fogGLSL}

uniform vec3 uSunColor;
uniform float uAmbient;

varying float vHeightFrac;
varying float vColorVar;
varying vec3  vWorldPos;
varying float vWind;
varying float vFlower;

void main() {
  vec3 baseCol = vec3(0.16, 0.30, 0.12);
  vec3 tipCol  = vec3(0.52, 0.68, 0.28);
  vec3 col = mix(baseCol, tipCol, vHeightFrac);
  col *= 0.8 + 0.4 * vColorVar;
  col += vWind * 0.06;

  // Wildflowers: colour the tip of a small fraction of blades.
  if (vFlower > 0.5) {
    vec3 fcol = vColorVar < 0.33 ? vec3(0.96, 0.86, 0.32)
              : vColorVar < 0.66 ? vec3(0.9, 0.42, 0.62)
              : vec3(0.88, 0.86, 0.96);
    col = mix(col, fcol, smoothstep(0.55, 1.0, vHeightFrac));
  }

  float ao = mix(0.5, 1.0, vHeightFrac);
  vec3 skyFill = vec3(0.42, 0.5, 0.72);
  vec3 ambient = (skyFill * 0.45 + uFogColor * 0.28) * uAmbient;
  vec3 lit = col * ao * (ambient + uSunColor * 1.05);

  float dist = distance(vWorldPos, cameraPosition);
  gl_FragColor = vec4(applyFog(lit, dist), 1.0);
}
`;
