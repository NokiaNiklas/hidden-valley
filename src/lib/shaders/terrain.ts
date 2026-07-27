import { fogGLSL } from '../env';

// Terrain height + smooth normals are baked into the geometry once on the CPU
// (see Terrain.svelte), so the vertex shader is a cheap pass-through.
export const terrainVertex = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const terrainFragment = /* glsl */ `
precision highp float;

${fogGLSL}

uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uAmbient;
uniform sampler2D uGrassTex;
uniform sampler2D uGrassNormal;
uniform float uHasTex;

varying vec3 vWorldPos;
varying vec3 vNormal;

void main() {
  vec3 n = normalize(vNormal);
  float h = vWorldPos.y;
  float slope = 1.0 - clamp(n.y, 0.0, 1.0);

  // Palette: riverbank sand -> valley -> meadow -> highland green.
  vec3 sand     = vec3(0.60, 0.54, 0.38);
  vec3 valley   = vec3(0.26, 0.38, 0.17);
  vec3 meadow   = vec3(0.32, 0.47, 0.19);
  vec3 highland = vec3(0.40, 0.46, 0.24);
  vec3 dirt     = vec3(0.40, 0.34, 0.24);

  vec3 rock = vec3(0.40, 0.37, 0.34);
  vec3 snow = vec3(0.95, 0.96, 1.0);

  vec3 albedo = mix(valley, meadow, smoothstep(-8.0, 6.0, h));
  albedo = mix(albedo, highland, smoothstep(14.0, 34.0, h));
  albedo = mix(sand, albedo, smoothstep(-10.0, -5.0, h));         // riverbanks
  albedo = mix(albedo, dirt, smoothstep(0.45, 0.7, slope));        // steep = dirt
  albedo = mix(albedo, rock, smoothstep(45.0, 95.0, h));           // mountain rock
  albedo = mix(albedo, snow, smoothstep(150.0, 210.0, h));         // snow caps
  albedo = mix(albedo, rock, smoothstep(0.6, 0.85, slope) * smoothstep(30.0, 80.0, h));

  // Grass ground texture + normal map: fills the bare ground between blades.
  if (uHasTex > 0.5) {
    vec2 guv = vWorldPos.xz * 0.14;
    vec3 gtex = texture2D(uGrassTex, guv).rgb;
    vec3 gnrm = texture2D(uGrassNormal, guv).xyz * 2.0 - 1.0;
    float grassy = (1.0 - smoothstep(28.0, 55.0, h))
                 * (1.0 - smoothstep(0.4, 0.7, slope))
                 * smoothstep(-7.0, -3.0, h);
    albedo = mix(albedo, gtex, grassy * 0.6);
    n = normalize(n + vec3(gnrm.x, 0.0, gnrm.y) * 0.7 * grassy);
  }

  float lambert = max(dot(n, uSunDir), 0.0);
  vec3 skyFill = vec3(0.42, 0.5, 0.72);
  vec3 ambient = (skyFill * 0.5 + uFogColor * 0.28) * uAmbient;
  vec3 lit = albedo * (ambient + uSunColor * lambert * 1.55);

  float dist = distance(vWorldPos, cameraPosition);
  gl_FragColor = vec4(applyFog(lit, dist), 1.0);
}
`;
