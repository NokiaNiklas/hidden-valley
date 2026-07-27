export const cloudsVertex = /* glsl */ `
varying vec3 vRayDir;
void main() {
  // Sphere is centered on the camera, so the surface position (relative to the
  // camera) is exactly the view ray direction.
  vec4 world = modelMatrix * vec4(position, 1.0);
  vRayDir = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const cloudsFragment = /* glsl */ `
precision highp float;

varying vec3 vRayDir;

uniform float uTime;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform vec3  uZenith;
uniform vec3  uHorizon;
uniform vec3  uCamPos;
uniform float uCloudBottom;
uniform float uCloudTop;
uniform float uLowBottom;
uniform float uLowTop;
uniform float uCoverage;
uniform vec3  uMoonDir;
uniform vec3  uMoonColor;
uniform float uNight;

const int MAIN_STEPS = 38;
const int LIGHT_STEPS = 3;

// --- 3D value-noise FBM ---
float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
  return mix(
    mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
    mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
    f.z
  );
}
float fbm3(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

float bandDensity(vec3 p, float b, float t, float cov, float span, float freq, float dens) {
  if (p.y < b || p.y > t) return 0.0;
  vec3 q = p * freq + vec3(uTime * 0.008, 0.0, uTime * 0.004);
  float f = fbm3(q);
  float hNorm = (p.y - b) / (t - b);
  float shape = smoothstep(0.0, 0.3, hNorm) * smoothstep(1.0, 0.55, hNorm);
  return smoothstep(cov, cov + span, f * shape) * dens;
}

float cloudDensity(vec3 p) {
  // High wispy layer only; low fluffy clouds are separate billboard puffs.
  return bandDensity(p, uCloudBottom, uCloudTop, uCoverage, 0.35, 0.0016, 1.0);
}

float lightMarch(vec3 p) {
  float ls = (uCloudTop - uCloudBottom) / float(LIGHT_STEPS) / max(uSunDir.y, 0.35);
  float dens = 0.0;
  vec3 lp = p;
  for (int i = 0; i < LIGHT_STEPS; i++) {
    lp += uSunDir * ls;
    dens += cloudDensity(lp);
  }
  return exp(-dens * ls * 0.05);
}

float starField(vec3 rd) {
  vec3 ip = floor(rd * 130.0);
  float h = fract(sin(dot(ip, vec3(12.99, 78.23, 37.72))) * 43758.5453);
  float s = smoothstep(0.9965, 1.0, h);
  float tw = 0.6 + 0.4 * sin(uTime * 3.0 + h * 100.0);
  return s * tw;
}

void main() {
  vec3 rd = normalize(vRayDir);
  float dayF = smoothstep(-0.05, 0.15, uSunDir.y);

  // --- sky gradient ---
  float up = clamp(rd.y, 0.0, 1.0);
  vec3 sky = mix(uHorizon, uZenith, pow(up, 0.45));

  // stars at night, above the horizon
  if (rd.y > 0.03) sky += vec3(0.9, 0.93, 1.0) * starField(rd) * uNight;

  // sun disc (while the sun is up)
  float sunUp = smoothstep(-0.04, 0.06, uSunDir.y);
  float sun = max(dot(rd, uSunDir), 0.0);
  sky += uSunColor * pow(sun, 500.0) * 1.5 * sunUp;
  sky += uSunColor * pow(sun, 12.0) * 0.12 * sunUp;

  // moon disc + soft glow (while the moon is up)
  float moonUp = smoothstep(-0.04, 0.06, uMoonDir.y);
  float moon = max(dot(rd, uMoonDir), 0.0);
  sky += uMoonColor * pow(moon, 1500.0) * 4.0 * moonUp;
  sky += uMoonColor * pow(moon, 60.0) * 0.12 * moonUp;

  vec3 color = sky;

  // --- cloud raymarch (only looking up into the slab) ---
  if (rd.y > 0.02) {
    float t0 = (uCloudBottom - uCamPos.y) / rd.y;
    float t1 = (uCloudTop - uCamPos.y) / rd.y;
    t0 = max(t0, 0.0);
    t1 = min(t1, 6000.0);

    if (t1 > t0) {
      float stepSize = (t1 - t0) / float(MAIN_STEPS);
      vec3 pos = uCamPos + rd * t0;
      float transmittance = 1.0;
      vec3 acc = vec3(0.0);

      for (int i = 0; i < MAIN_STEPS; i++) {
        float d = cloudDensity(pos);
        if (d > 0.01) {
          float light = lightMarch(pos);
          vec3 cc = mix(vec3(0.44, 0.5, 0.62), vec3(1.0, 0.97, 0.9), light);
          cc = mix(vec3(0.09, 0.11, 0.2), cc, dayF); // clouds go dark at night
          float absorb = d * stepSize * 0.02;
          acc += transmittance * absorb * cc;
          transmittance *= exp(-absorb);
        }
        if (transmittance < 0.03) break;
        pos += rd * stepSize;
      }

      float alpha = (1.0 - transmittance) * smoothstep(0.02, 0.16, rd.y);
      color = mix(color, acc + sky * transmittance, alpha);
    }
  }

  gl_FragColor = vec4(color, 1.0);
}
`;
