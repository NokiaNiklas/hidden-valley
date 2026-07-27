<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { PlaneGeometry, ShaderMaterial, Color } from 'three';
  import { waterVertex, waterFragment } from '../shaders/water';
  import { MAP_HALF, WATER_LEVEL } from '../shaders/noise';
  import { SUN_DIR, SUN_COLOR, SKY_HORIZON, FOG_COLOR, FOG_DENSITY } from '../env';

  const geometry = new PlaneGeometry(MAP_HALF * 2, MAP_HALF * 2, 240, 240);

  const material = new ShaderMaterial({
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DIR },
      uSunColor: { value: SUN_COLOR },
      uHorizon: { value: SKY_HORIZON },
      uDeep: { value: new Color('#0d3a48') },
      uWaterLevel: { value: WATER_LEVEL },
      uFogColor: { value: FOG_COLOR },
      uFogDensity: { value: FOG_DENSITY }
    }
  });

  useTask((delta) => {
    material.uniforms.uTime.value += delta;
  });
</script>

<T.Mesh
  {geometry}
  {material}
  rotation.x={-Math.PI / 2}
  position.y={WATER_LEVEL}
  frustumCulled={false}
  renderOrder={2}
/>
