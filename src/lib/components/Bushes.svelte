<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import {
    IcosahedronGeometry,
    MeshStandardMaterial,
    InstancedMesh,
    Object3D,
    Color,
    Float32BufferAttribute
  } from 'three';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { terrainHeight, WATER_LEVEL, MEADOW_R } from '../shaders/noise';

  const CELL = 8;
  const GRID = 64; // ±256 units around the camera
  const COUNT = GRID * GRID;

  const { camera } = useThrelte();

  function paint(geo: any, color: Color) {
    const c = geo.attributes.position.count;
    const arr = new Float32Array(c * 3);
    for (let i = 0; i < c; i++) {
      arr[i * 3] = color.r;
      arr[i * 3 + 1] = color.g;
      arr[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
    return geo;
  }

  // a rounded shrub: a few overlapping green blobs
  const blobs: number[][] = [
    [0, 0.7, 0, 1.0, 0.5],
    [0.8, 0.5, 0.2, 0.7, 0.35],
    [-0.7, 0.5, -0.2, 0.7, 0.4],
    [0.1, 1.1, 0.1, 0.65, 0.7]
  ];
  const bushGeo = mergeGeometries(
    blobs.map(([x, y, z, r, v]) =>
      paint(
        new IcosahedronGeometry(r, 1).toNonIndexed().translate(x, y, z),
        new Color(0.16 + v * 0.14, 0.34 + v * 0.16, 0.13 + v * 0.08)
      )
    )
  );

  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
  const mesh = new InstancedMesh(bushGeo, material, COUNT);
  mesh.frustumCulled = false;

  const dummy = new Object3D();
  const fract = (x: number) => x - Math.floor(x);
  const rand = (x: number, z: number) => fract(Math.sin(x * 34.17 + z * 61.93) * 18251.7);

  let lastCX = NaN;
  let lastCZ = NaN;

  function rebuild(camX: number, camZ: number) {
    const snapX = Math.round(camX / CELL) * CELL;
    const snapZ = Math.round(camZ / CELL) * CELL;
    let idx = 0;
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const cx = snapX + (i - GRID / 2) * CELL;
        const cz = snapZ + (j - GRID / 2) * CELL;
        const r = rand(cx, cz);
        let place = r < 0.12;
        if (place) {
          const jx = cx + (rand(cx + 2.1, cz) - 0.5) * CELL;
          const jz = cz + (rand(cx, cz + 3.7) - 0.5) * CELL;
          const gy = terrainHeight(jx, jz);
          if (gy > 40 || gy < WATER_LEVEL + 1.5 || Math.hypot(jx, jz) > MEADOW_R - 5) {
            place = false;
          } else {
            const s = 0.8 + rand(cx + 4.4, cz + 1.1) * 1.7;
            dummy.position.set(jx, gy - 0.2, jz);
            dummy.scale.set(s, s * (0.8 + rand(cx, cz) * 0.4), s);
            dummy.rotation.set(0, r * 40, 0);
          }
        }
        if (!place) {
          dummy.position.set(0, -9999, 0);
          dummy.scale.setScalar(0);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  useTask(() => {
    const c = camera.current.position;
    const sx = Math.round(c.x / CELL);
    const sz = Math.round(c.z / CELL);
    if (sx !== lastCX || sz !== lastCZ) {
      lastCX = sx;
      lastCZ = sz;
      rebuild(c.x, c.z);
    }
  });
</script>

<T is={mesh} />
