import { fogGLSL } from '../env';
import { noiseGLSL } from './noise';

export const waterVertex = /* glsl */ `
${noiseGLSL}

uniform float uWaterLevel;

varying vec3 vWorldPos;
varying float vDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  // Depth = how far the water surface is above the land here. Computed per vertex
  // (cheap) and interpolated, instead of sampling the terrain per fragment.
  vDepth = uWaterLevel - terrainHeight(world.xz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const waterFragment = /* glsl */ `
precision highp float;

${fogGLSL}

uniform float uTime;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform vec3  uHorizon;
uniform vec3  uDeep;

varying vec3 vWorldPos;
varying float vDepth;

void main() {
  vec2 p = vWorldPos.xz;
  float t = uTime;

  // Fake ripple normal from a couple of moving wave gradients.
  vec2 g = vec2(0.0);
  g += vec2(cos(p.x * 0.35 + t * 1.3), cos(p.y * 0.35 + t * 1.1)) * 0.12;
  g += vec2(cos(p.x * 0.9 - t * 1.7), cos(p.y * 0.8 + t * 1.9)) * 0.05;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));

  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

  vec3 hlf = normalize(uSunDir + viewDir);
  float spec = pow(max(dot(n, hlf), 0.0), 120.0);

  vec3 water = mix(uDeep, uHorizon, clamp(fres * 0.6, 0.0, 1.0));
  water += uSunColor * spec * 1.6;

  // Shoreline waves: animated foam bands where the water meets the land.
  float shore = 1.0 - smoothstep(0.0, 3.5, vDepth);
  float wobble = sin(p.x * 0.4) + sin(p.y * 0.35);
  float wave = sin(vDepth * 3.5 - t * 2.2 + wobble);
  float foam = smoothstep(0.55, 1.0, wave) * shore;
  float edge = smoothstep(0.25, 0.0, vDepth);
  water = mix(water, vec3(0.92, 0.96, 0.98), clamp(foam + edge * 0.6, 0.0, 1.0));
  float alpha = mix(0.86, 1.0, shore);

  float dist = distance(vWorldPos, cameraPosition);
  gl_FragColor = vec4(applyFog(water, dist), alpha);
}
`;
