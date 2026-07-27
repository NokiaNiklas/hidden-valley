import { fogGLSL } from '../env';

export const fluffyVertex = /* glsl */ `
attribute vec3 aCluster;   // cloud clump centre
attribute vec3 aOffset;    // puff offset within the clump
attribute float aSize;
attribute float aTint;

uniform float uTime;
uniform vec2  uCamXZ;
uniform float uRange;

varying vec2  vUv;
varying float vTint;
varying float vDist;

void main() {
  // Drift with the wind and wrap the clump into a tile around the camera so
  // there are always low clouds nearby on the big map.
  vec3 c = aCluster;
  c.x += uTime * 2.5;
  c.x = mod(c.x - uCamXZ.x + uRange, 2.0 * uRange) - uRange + uCamXZ.x;
  c.z = mod(c.z - uCamXZ.y + uRange, 2.0 * uRange) - uRange + uCamXZ.y;

  vec3 center = c + aOffset;
  vDist = distance(center, cameraPosition);

  // Billboard: expand the quad in view space so it always faces the camera.
  vec4 mv = viewMatrix * vec4(center, 1.0);
  mv.xy += position.xy * aSize;

  vUv = position.xy;
  vTint = aTint;
  gl_Position = projectionMatrix * mv;
}
`;

export const fluffyFragment = /* glsl */ `
precision highp float;

${fogGLSL}

uniform vec3 uColor;
uniform vec3 uShadow;
uniform vec3 uSunColor;
uniform float uAmbient;

varying vec2  vUv;
varying float vTint;
varying float vDist;

void main() {
  float r = length(vUv);
  float alpha = smoothstep(1.0, 0.12, r);
  alpha *= alpha; // extra-soft, fuzzy edge -> cotton-candy

  float shade = 0.5 + 0.5 * vUv.y;          // brighter toward the top
  vec3 col = mix(uShadow, uColor, shade) * vTint;
  col += uSunColor * pow(shade, 3.0) * 0.14;
  col *= 0.35 + 0.65 * uAmbient; // darker at night (moonlit)

  col = applyFog(col, vDist);
  gl_FragColor = vec4(col, alpha * 0.85);
}
`;
