<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import {
    InstancedBufferAttribute,
    InstancedBufferGeometry,
    BufferAttribute,
    ShaderMaterial,
    DoubleSide,
    Vector3
  } from 'three';
  import { grassVertex, grassFragment } from '../shaders/grass';
  import { SUN_COLOR, FOG_COLOR, FOG_DENSITY, sky } from '../env';

  const SEGMENTS = 3;

  // LOD rings: dense & detailed near the camera, coarser (fewer, wider blades)
  // farther out. Beyond the outermost ring there is simply no grass — the
  // distance fog hides the cut-off.
  // Detailed near ring reaches much further now; coarser rings extend the field
  // out to ~540 units. Overlapping inner/outer fades keep the transitions seamless.
  const LAYERS = [
    { grid: 340, spacing: 0.42, inner: 0, width: 1.0, height: 1.0, flowers: 1 }, // half ≈ 71
    { grid: 340, spacing: 0.8, inner: 56, width: 1.5, height: 1.12, flowers: 1 }, // half ≈ 136 (denser)
    { grid: 320, spacing: 1.8, inner: 118, width: 2.4, height: 1.3, flowers: 0 }, // half ≈ 288 (denser)
    { grid: 260, spacing: 4.6, inner: 250, width: 4.4, height: 1.6, flowers: 0 } // half ≈ 598 (further)
  ];

  const { camera } = useThrelte();

  function makeBladeGeometry(grid: number, spacing: number) {
    const halfW = 0.08;
    const positions: number[] = [];
    const indices: number[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const w = halfW * (1 - t);
      positions.push(-w, t, 0, w, t, 0);
    }
    for (let i = 0; i < SEGMENTS; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new InstancedBufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geo.setIndex(indices);

    const offsets = new Float32Array(grid * grid * 2);
    let p = 0;
    for (let i = 0; i < grid; i++) {
      for (let j = 0; j < grid; j++) {
        offsets[p++] = (i - grid / 2) * spacing;
        offsets[p++] = (j - grid / 2) * spacing;
      }
    }
    geo.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 2));
    geo.instanceCount = grid * grid;
    return geo;
  }

  const layers = LAYERS.map((l) => {
    const geometry = makeBladeGeometry(l.grid, l.spacing);
    const material = new ShaderMaterial({
      vertexShader: grassVertex,
      fragmentShader: grassFragment,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uCamXZ: { value: [0, 0] },
        uCamDir: { value: [0, 1] },
        uSpacing: { value: l.spacing },
        uInner: { value: l.inner },
        uOuter: { value: (l.grid * l.spacing) / 2 },
        uBladeWidth: { value: l.width },
        uHeightMul: { value: l.height },
        uFlowers: { value: l.flowers },
        uAmbient: { value: 1 },
        uSunColor: { value: SUN_COLOR },
        uFogColor: { value: FOG_COLOR },
        uFogDensity: { value: FOG_DENSITY }
      }
    });
    return { geometry, material };
  });

  const fwd = new Vector3();
  useTask((delta) => {
    const c = camera.current.position;
    camera.current.getWorldDirection(fwd);
    const len = Math.hypot(fwd.x, fwd.z) || 1;
    const dx = fwd.x / len;
    const dz = fwd.z / len;
    for (const { material } of layers) {
      material.uniforms.uTime.value += delta;
      material.uniforms.uCamXZ.value = [c.x, c.z];
      material.uniforms.uCamDir.value = [dx, dz];
      material.uniforms.uAmbient.value = sky.ambient;
    }
  });
</script>

{#each layers as { geometry, material }}
  <T.Mesh {geometry} {material} frustumCulled={false} renderOrder={1} />
{/each}
