<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import {
    InstancedBufferGeometry,
    InstancedBufferAttribute,
    BufferAttribute,
    ShaderMaterial,
    DoubleSide,
    Color
  } from 'three';
  import { fogGLSL, FOG_COLOR, FOG_DENSITY } from '../env';

  const COUNT = 34;
  const { camera } = useThrelte();

  // one bird = two shallow-V wing triangles; wing tips at |x| = 1
  const geometry = new InstancedBufferGeometry();
  // prettier-ignore
  const verts = new Float32Array([
    0,0,0,  -1,0,-0.3,  -0.15,0,0.12,
    0,0,0,   0.15,0,0.12, 1,0,-0.3
  ]);
  geometry.setAttribute('position', new BufferAttribute(verts, 3));

  const params = new Float32Array(COUNT * 4); // cx, cz (rel cam), radius, height
  const phase = new Float32Array(COUNT);
  const speed = new Float32Array(COUNT);
  const scale = new Float32Array(COUNT);
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  for (let i = 0; i < COUNT; i++) {
    params[i * 4] = rnd(-220, 220);
    params[i * 4 + 1] = rnd(-220, 220);
    params[i * 4 + 2] = rnd(18, 60);
    params[i * 4 + 3] = rnd(150, 240);
    phase[i] = rnd(0, 6.28);
    speed[i] = rnd(0.1, 0.22) * (Math.random() < 0.5 ? 1 : -1);
    scale[i] = rnd(2.2, 4.5);
  }
  geometry.setAttribute('aParams', new InstancedBufferAttribute(params, 4));
  geometry.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1));
  geometry.setAttribute('aSpeed', new InstancedBufferAttribute(speed, 1));
  geometry.setAttribute('aScale', new InstancedBufferAttribute(scale, 1));
  geometry.instanceCount = COUNT;

  const material = new ShaderMaterial({
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uCamXZ: { value: [0, 0] },
      uColor: { value: new Color('#39414d') },
      uFogColor: { value: FOG_COLOR },
      uFogDensity: { value: FOG_DENSITY }
    },
    vertexShader: /* glsl */ `
      attribute vec4 aParams;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aScale;
      uniform float uTime;
      uniform vec2 uCamXZ;
      varying float vDist;
      void main() {
        float t = uTime * aSpeed + aPhase;
        vec2 center = aParams.xy + uCamXZ;
        vec2 c = center + vec2(cos(t), sin(t)) * aParams.z;
        vec2 dir = vec2(-sin(t), cos(t));
        float head = atan(dir.x, dir.y);
        float cs = cos(head), sn = sin(head);
        vec3 lp = position * aScale;
        lp.y += abs(position.x) * sin(uTime * 8.0 + aPhase) * 0.5 * aScale; // flap
        vec2 rot = vec2(lp.x * cs - lp.z * sn, lp.x * sn + lp.z * cs);
        vec3 world = vec3(c.x + rot.x, aParams.w + lp.y, c.y + rot.y);
        vDist = distance(world, cameraPosition);
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      ${fogGLSL}
      uniform vec3 uColor;
      varying float vDist;
      void main() {
        gl_FragColor = vec4(applyFog(uColor, vDist), 1.0);
      }
    `
  });

  useTask((delta) => {
    material.uniforms.uTime.value += delta;
    const c = camera.current.position;
    material.uniforms.uCamXZ.value = [c.x, c.z];
  });
</script>

<T.Mesh {geometry} {material} frustumCulled={false} renderOrder={1} />
