<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import {
    InstancedBufferGeometry,
    InstancedBufferAttribute,
    BufferAttribute,
    ShaderMaterial,
    Color
  } from 'three';
  import { fluffyVertex, fluffyFragment } from '../shaders/fluffy';
  import { SUN_COLOR, FOG_COLOR, FOG_DENSITY, sky } from '../env';

  const CLUMPS = 9;
  const PUFFS = 40;
  const COUNT = CLUMPS * PUFFS;
  const RANGE = 750;

  const { camera } = useThrelte();

  // base quad
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3)
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const cluster = new Float32Array(COUNT * 3);
  const offset = new Float32Array(COUNT * 3);
  const size = new Float32Array(COUNT);
  const tint = new Float32Array(COUNT);

  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  let k = 0;
  for (let c = 0; c < CLUMPS; c++) {
    const cx = rnd(-RANGE, RANGE);
    const cz = rnd(-RANGE, RANGE);
    const cy = rnd(95, 155); // low, but a bit higher than before
    const spread = rnd(32, 52); // more compact
    for (let p = 0; p < PUFFS; p++) {
      // bias puffs toward the clump centre for a fluffy, rounded, compact mass
      const ox = (rnd(-1, 1) + rnd(-1, 1)) * 0.5 * spread;
      const oy = (rnd(-1, 1) + rnd(-1, 1)) * 0.5 * spread * 0.28;
      const oz = (rnd(-1, 1) + rnd(-1, 1)) * 0.5 * spread;
      cluster[k * 3] = cx;
      cluster[k * 3 + 1] = cy;
      cluster[k * 3 + 2] = cz;
      offset[k * 3] = ox;
      offset[k * 3 + 1] = oy;
      offset[k * 3 + 2] = oz;
      size[k] = spread * rnd(0.5, 0.9);
      tint[k] = rnd(0.85, 1.12);
      k++;
    }
  }

  geometry.setAttribute('aCluster', new InstancedBufferAttribute(cluster, 3));
  geometry.setAttribute('aOffset', new InstancedBufferAttribute(offset, 3));
  geometry.setAttribute('aSize', new InstancedBufferAttribute(size, 1));
  geometry.setAttribute('aTint', new InstancedBufferAttribute(tint, 1));
  geometry.instanceCount = COUNT;

  const material = new ShaderMaterial({
    vertexShader: fluffyVertex,
    fragmentShader: fluffyFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uCamXZ: { value: [0, 0] },
      uRange: { value: RANGE },
      uColor: { value: new Color('#fff3ec') },
      uShadow: { value: new Color('#c7b6cf') },
      uSunColor: { value: SUN_COLOR },
      uAmbient: { value: 1 },
      uFogColor: { value: FOG_COLOR },
      uFogDensity: { value: FOG_DENSITY }
    }
  });

  useTask((delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uAmbient.value = sky.ambient;
    const c = camera.current.position;
    material.uniforms.uCamXZ.value = [c.x, c.z];
  });
</script>

<T.Mesh {geometry} {material} frustumCulled={false} renderOrder={3} />
