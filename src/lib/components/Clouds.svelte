<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import { SphereGeometry, ShaderMaterial, BackSide, Vector3 } from 'three';
  import { cloudsVertex, cloudsFragment } from '../shaders/clouds';
  import {
    SUN_DISK_DIR,
    SUN_DISK_COLOR,
    MOON_DIR,
    MOON_COLOR,
    SKY_ZENITH,
    SKY_HORIZON,
    CLOUD_BOTTOM,
    CLOUD_TOP,
    LOW_CLOUD_BOTTOM,
    LOW_CLOUD_TOP,
    sky
  } from '../env';

  const { camera } = useThrelte();

  const geometry = new SphereGeometry(5000, 32, 16);

  const uCamPos = new Vector3();
  const material = new ShaderMaterial({
    vertexShader: cloudsVertex,
    fragmentShader: cloudsFragment,
    side: BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: SUN_DISK_DIR },
      uSunColor: { value: SUN_DISK_COLOR },
      uMoonDir: { value: MOON_DIR },
      uMoonColor: { value: MOON_COLOR },
      uNight: { value: 0 },
      uZenith: { value: SKY_ZENITH },
      uHorizon: { value: SKY_HORIZON },
      uCamPos: { value: uCamPos },
      uCloudBottom: { value: CLOUD_BOTTOM },
      uCloudTop: { value: CLOUD_TOP },
      uLowBottom: { value: LOW_CLOUD_BOTTOM },
      uLowTop: { value: LOW_CLOUD_TOP },
      uCoverage: { value: 0.5 }
    }
  });

  let x = $state(0);
  let y = $state(0);
  let z = $state(0);

  useTask((delta) => {
    material.uniforms.uTime.value += delta;
    material.uniforms.uNight.value = sky.night;
    const c = camera.current.position;
    uCamPos.copy(c);
    x = c.x;
    y = c.y;
    z = c.z;
  });
</script>

<T.Mesh {geometry} {material} position.x={x} position.y={y} position.z={z} renderOrder={-1000} frustumCulled={false} />
