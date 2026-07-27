<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import {
    CylinderGeometry,
    MeshStandardMaterial,
    InstancedMesh,
    Object3D,
    Color,
    Float32BufferAttribute
  } from 'three';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { terrainHeight, WATER_LEVEL } from '../shaders/noise';

  const CELL = 5;
  const GRID = 46; // ±115 around the camera (reeds only appear at the shoreline)
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

  const green = new Color(0.22, 0.36, 0.16);
  const brown = new Color(0.42, 0.26, 0.12);

  // a cattail cluster: a few stalks with brown tips
  const parts: any[] = [];
  const stalks = [
    [0, 0],
    [0.35, 0.2],
    [-0.3, -0.15],
    [0.15, -0.35]
  ];
  for (const [sx, sz] of stalks) {
    const h = 2.2 + Math.random() * 0.8;
    parts.push(paint(new CylinderGeometry(0.03, 0.06, h, 5).toNonIndexed().translate(sx, h / 2, sz), green));
    parts.push(
      paint(new CylinderGeometry(0.11, 0.11, 0.55, 6).toNonIndexed().translate(sx, h - 0.1, sz), brown)
    );
  }
  const reedGeo = mergeGeometries(parts);

  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const mesh = new InstancedMesh(reedGeo, material, COUNT);
  mesh.frustumCulled = false;

  const dummy = new Object3D();
  const fract = (x: number) => x - Math.floor(x);
  const rand = (x: number, z: number) => fract(Math.sin(x * 51.3 + z * 13.9) * 9271.3);

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
        const jx = cx + (rand(cx + 1.1, cz) - 0.5) * CELL;
        const jz = cz + (rand(cx, cz + 2.3) - 0.5) * CELL;
        const gy = terrainHeight(jx, jz);
        const depth = WATER_LEVEL - gy;
        // only in the shore band, fairly dense there
        const place = depth > -1.5 && depth < 2.5 && r < 0.32;
        if (place) {
          const s = 0.85 + rand(cx + 7.7, cz + 2.2) * 0.7;
          dummy.position.set(jx, gy - 0.1, jz);
          dummy.scale.setScalar(s);
          dummy.rotation.set(0, r * 40, 0);
        } else {
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
