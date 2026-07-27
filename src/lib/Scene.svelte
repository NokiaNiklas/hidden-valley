<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import { onMount } from 'svelte';
  import { ACESFilmicToneMapping, Color, FogExp2, DirectionalLight, HemisphereLight } from 'three';
  import Terrain from './components/Terrain.svelte';
  import Water from './components/Water.svelte';
  import Grass from './components/Grass.svelte';
  import Trees from './components/Trees.svelte';
  import Clouds from './components/Clouds.svelte';
  import FluffyClouds from './components/FluffyClouds.svelte';
  import Rocks from './components/Rocks.svelte';
  import Bushes from './components/Bushes.svelte';
  import Reeds from './components/Reeds.svelte';
  import Bridge from './components/Bridge.svelte';
  import Birds from './components/Birds.svelte';
  import WalkController from './components/WalkController.svelte';
  import { updateSky, sky, SUN_DIR, SKY_HORIZON, FOG_COLOR, FOG_DENSITY } from './env';

  const { scene, renderer } = useThrelte();

  let sunLight: DirectionalLight | undefined = $state();
  let hemi: HemisphereLight | undefined = $state();
  let elapsed = 12;

  onMount(() => {
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    scene.fog = new FogExp2(FOG_COLOR.clone(), FOG_DENSITY);
    scene.background = SKY_HORIZON.clone();
  });

  useTask((delta) => {
    elapsed += delta;
    updateSky(elapsed);
    if (scene.fog) (scene.fog as FogExp2).color.copy(FOG_COLOR);
    if (scene.background && (scene.background as Color).isColor) (scene.background as Color).copy(SKY_HORIZON);
    if (sunLight) {
      sunLight.color.copy(sky.lightColor);
      sunLight.intensity = sky.keyIntensity;
      sunLight.position.set(SUN_DIR.x * 400, SUN_DIR.y * 400, SUN_DIR.z * 400);
    }
    if (hemi) {
      hemi.intensity = sky.hemiIntensity;
      hemi.color.copy(SKY_HORIZON);
    }
  });
</script>

<T.PerspectiveCamera
  makeDefault
  fov={62}
  near={0.1}
  far={6000}
  position={[-120, 6, -128]}
  rotation.y={3.14159}
  rotation.x={0.04}
>
  <WalkController />
</T.PerspectiveCamera>

<T.DirectionalLight bind:ref={sunLight} intensity={2.4} />
<T.HemisphereLight bind:ref={hemi} args={[0xdbe4e2, 0x2f4a24, 1.1]} />

<Clouds />
<FluffyClouds />
<Birds />
<Terrain />
<Water />
<Bridge />
<Grass />
<Trees />
<Bushes />
<Reeds />
<Rocks />
