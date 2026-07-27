<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { onMount } from 'svelte';
  import { PlaneGeometry, ShaderMaterial, CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
  import { terrainVertex, terrainFragment } from '../shaders/terrain';
  import { MAP_HALF, terrainHeight } from '../shaders/noise';
  import { SUN_DIR, SUN_COLOR, FOG_COLOR, FOG_DENSITY, sky } from '../env';

  const SIZE = MAP_HALF * 2;
  const SEGMENTS = 512;

  // Bake the fixed terrain once: displace to world XZ and compute smooth normals,
  // so nothing terrain-related runs per frame in the shader.
  const geometry = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS);
  geometry.rotateX(-Math.PI / 2); // now lies in the XZ plane
  {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  const material = new ShaderMaterial({
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment,
    uniforms: {
      uSunDir: { value: SUN_DIR },
      uSunColor: { value: SUN_COLOR },
      uAmbient: { value: 1 },
      uGrassTex: { value: null },
      uGrassNormal: { value: null },
      uHasTex: { value: 0 },
      uFogColor: { value: FOG_COLOR },
      uFogDensity: { value: FOG_DENSITY }
    }
  });

  // Procedural tileable grass albedo + normal map (client only).
  function makeGrassTextures() {
    const S = 256;
    const grid = 32;
    const seed = new Float32Array(grid * grid);
    for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
    const noise = (x: number, y: number) => {
      x *= grid;
      y *= grid;
      const x0 = ((Math.floor(x) % grid) + grid) % grid;
      const y0 = ((Math.floor(y) % grid) + grid) % grid;
      const x1 = (x0 + 1) % grid;
      const y1 = (y0 + 1) % grid;
      const fx = x - Math.floor(x);
      const fy = y - Math.floor(y);
      const s = (a: number, b: number, t: number) => a + (b - a) * (t * t * (3 - 2 * t));
      return s(
        s(seed[y0 * grid + x0], seed[y0 * grid + x1], fx),
        s(seed[y1 * grid + x0], seed[y1 * grid + x1], fx),
        fy
      );
    };
    const fbmv = (x: number, y: number) => {
      let v = 0,
        a = 0.5,
        f = 1;
      for (let k = 0; k < 4; k++) {
        v += a * noise(x * f, y * f);
        f *= 2;
        a *= 0.5;
      }
      return v;
    };

    const hgt = new Float32Array(S * S);
    const alb = document.createElement('canvas');
    alb.width = alb.height = S;
    const ac = alb.getContext('2d')!;
    const img = ac.createImageData(S, S);
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const u = px / S;
        const v = py / S;
        const streak = 0.5 + 0.5 * Math.sin(u * S * 0.5 + noise(u * 4, v * 4) * 8);
        const n = fbmv(u, v) * 0.7 + streak * 0.3;
        hgt[py * S + px] = n;
        const t = Math.min(1, Math.max(0, n));
        const idx = (py * S + px) * 4;
        img.data[idx] = 255 * (0.18 + (0.42 - 0.18) * t);
        img.data[idx + 1] = 255 * (0.34 + (0.56 - 0.34) * t);
        img.data[idx + 2] = 255 * (0.13 + (0.24 - 0.13) * t);
        img.data[idx + 3] = 255;
      }
    }
    ac.putImageData(img, 0, 0);

    const nrm = document.createElement('canvas');
    nrm.width = nrm.height = S;
    const nc = nrm.getContext('2d')!;
    const nimg = nc.createImageData(S, S);
    const H = (x: number, y: number) => hgt[(((y % S) + S) % S) * S + (((x % S) + S) % S)];
    for (let py = 0; py < S; py++) {
      for (let px = 0; px < S; px++) {
        const dx = H(px + 1, py) - H(px - 1, py);
        const dy = H(px, py + 1) - H(px, py - 1);
        let nx = -dx * 2.0;
        let ny = -dy * 2.0;
        let nz = 1.0;
        const len = Math.hypot(nx, ny, nz);
        nx /= len;
        ny /= len;
        nz /= len;
        const idx = (py * S + px) * 4;
        nimg.data[idx] = 255 * (nx * 0.5 + 0.5);
        nimg.data[idx + 1] = 255 * (ny * 0.5 + 0.5);
        nimg.data[idx + 2] = 255 * (nz * 0.5 + 0.5);
        nimg.data[idx + 3] = 255;
      }
    }
    nc.putImageData(nimg, 0, 0);

    const at = new CanvasTexture(alb);
    at.wrapS = at.wrapT = RepeatWrapping;
    at.colorSpace = SRGBColorSpace;
    const nt = new CanvasTexture(nrm);
    nt.wrapS = nt.wrapT = RepeatWrapping;
    return { albedo: at, normal: nt };
  }

  onMount(() => {
    const { albedo, normal } = makeGrassTextures();
    material.uniforms.uGrassTex.value = albedo;
    material.uniforms.uGrassNormal.value = normal;
    material.uniforms.uHasTex.value = 1;
  });

  useTask(() => {
    material.uniforms.uAmbient.value = sky.ambient;
  });
</script>

<T.Mesh {geometry} {material} frustumCulled={false} />
