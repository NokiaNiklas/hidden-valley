# Hidden Valley

A stylized, fully procedural 3D landscape you can walk through in the browser — a
meadow valley with a meandering river, rolling hills ringed by snow‑capped
mountains, wind‑blown grass, trees, wildlife and a fast day/night cycle. Built
with **SvelteKit + [Threlte](https://threlte.xyz) (Three.js)**.

Everything is generated in code — there are **no external 3D models or textures**.
Terrain, grass, trees, water, clouds and the ground texture are all procedural
(noise fields + custom GLSL shaders + canvas‑generated textures).

## Features

- **Procedural terrain** – a fixed valley with a meandering river carved between
  two hill ridges, surrounded by a 360° mountain range (rock + snow). Height is
  baked once on the CPU for performance.
- **Instanced grass** with 4 distance LODs, wind gusts that sweep across the field
  in patches, wildflowers, and a procedural grass ground texture + normal map so
  the ground between blades never looks bare.
- **Trees, bushes, reeds & rocks** – camera‑following instanced scatter with
  view‑cone culling; reeds line the shoreline.
- **Water** – animated ripples, sky reflection and foam/waves along the coast.
- **Sky** – ray‑marched volumetric high clouds + low, fluffy “cotton‑candy”
  billboard clouds, plus birds circling high above.
- **Day/night cycle** (~2 min) – moving sun, sunset tint, and at night a starfield
  and a moon bright enough to light the scene.
- **Stylized wooden bridge** across the river that you can actually walk over.
- **First‑person controller** – WASD walk with sprint & jump, plus a toggleable
  fly mode.

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) + Svelte 5 (runes)
- [@threlte/core](https://threlte.xyz) 8 + Three.js
- TypeScript, Vite
- Custom GLSL shaders throughout

## Prerequisites

- **Node.js** 20+ (developed on 24)
- **pnpm** (developed on 11) – `npm install -g pnpm` if you don't have it

## Setup

```bash
# clone
git clone git@github.com:NokiaNiklas/hidden-valley.git
cd hidden-valley

# install dependencies
pnpm install

# start the dev server
pnpm dev
```

Then open the URL it prints (default http://localhost:5173) and **click the scene**
to capture the mouse.

### Other commands

```bash
pnpm dev --open      # start and open the browser
pnpm build           # production build
pnpm preview         # preview the production build
pnpm check           # type-check (svelte-check)
```

## Controls

| Key / Input | Action |
|-------------|--------|
| **Click**   | Capture mouse (pointer lock) |
| **W A S D** | Walk |
| **Mouse**   | Look around |
| **Shift**   | Sprint |
| **Space**   | Jump (in fly mode: up) |
| **F**       | Toggle fly mode |
| **C / Ctrl**| Fly mode: down |

## Project structure

```
src/
  routes/+page.svelte        # full-screen <Canvas> + HUD overlay
  lib/
    Scene.svelte             # camera, lights, fog, day/night driver, assembles the world
    env.ts                   # shared sun/moon/sky/fog state + updateSky() day-night cycle
    bridge.ts                # bridge geometry config + walkable deck-height function
    components/
      Terrain.svelte         # baked procedural terrain + grass ground texture
      Water.svelte           # river with ripples + shoreline foam
      Grass.svelte           # instanced LOD grass
      Trees.svelte           # instanced branched trees (2 LODs)
      Bushes / Reeds / Rocks # scattered props
      Bridge.svelte          # stylized wooden bridge
      Clouds.svelte          # ray-marched sky + sun/moon/stars
      FluffyClouds.svelte    # low billboard puff clouds
      Birds.svelte           # circling birds
      WalkController.svelte   # WASD walk / sprint / jump / fly toggle
    shaders/                 # noise.ts, terrain.ts, grass.ts, clouds.ts, water.ts, fluffy.ts
```

## How it works (short version)

- **Shared height field** (`shaders/noise.ts`) exists in both GLSL and JS from the
  same constants, so GPU‑displaced terrain and CPU‑placed props always agree.
- **Day/night** (`env.ts`) mutates shared `Color`/`Vector3` uniforms in place each
  frame; every material references those objects, so the whole scene transitions
  automatically.
- **Performance**: the static terrain is baked once (height + normals in the
  geometry); grass and trees are frustum/view‑cone culled; the water samples the
  terrain per‑vertex, not per‑pixel.

## Tuning

Common knobs if you want to tweak look or performance:

- Day/night length: `CYCLE_SECONDS` in `src/lib/env.ts`
- Grass density / reach: the `LAYERS` array in `src/lib/components/Grass.svelte`
- Terrain resolution: `SEGMENTS` in `src/lib/components/Terrain.svelte`
- Cloud quality: `MAIN_STEPS` in `src/lib/shaders/clouds.ts`
- Character size / speed: props in `src/lib/components/WalkController.svelte`

---

Built as a procedural graphics playground. No assets, just math and shaders.
