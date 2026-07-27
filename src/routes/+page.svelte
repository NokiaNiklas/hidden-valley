<script lang="ts">
  import { Canvas } from '@threlte/core';
  import Scene from '$lib/Scene.svelte';
</script>

<svelte:head>
  <title>Hidden Valley</title>
</svelte:head>

<div class="stage">
  <Canvas>
    <Scene />
  </Canvas>

  <div class="overlay">
    <h1>Hidden Valley</h1>
    <p>Klicken zum Loslegen · <b>WASD</b> laufen · <b>Maus</b> umsehen · <b>Shift</b> sprinten · <b>Space</b> springen · <b>F</b> Fly-Mode</p>
  </div>
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
    background: #cde0ea;
  }

  .stage {
    position: fixed;
    inset: 0;
  }

  .overlay {
    position: absolute;
    left: 50%;
    bottom: 6vh;
    transform: translateX(-50%);
    text-align: center;
    color: #fff;
    font-family: system-ui, sans-serif;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    user-select: none;
  }

  .overlay h1 {
    margin: 0 0 0.3em;
    font-size: clamp(2rem, 6vw, 4rem);
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .overlay p {
    margin: 0;
    font-size: clamp(0.8rem, 1.6vw, 1rem);
    opacity: 0.9;
  }
</style>
