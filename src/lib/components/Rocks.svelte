<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import { IcosahedronGeometry, MeshStandardMaterial, InstancedMesh, Object3D, Color } from 'three';
  import { terrainHeight, WATER_LEVEL, MEADOW_R } from '../shaders/noise';

  const CELL = 16;
  const GRID = 40; // ±320 units around the camera
  const COUNT = GRID * GRID;

  const { camera } = useThrelte();

  // Irregular boulder: perturb an icosphere by a position-hash so shared
  // vertices stay welded (no cracks), flat-shaded for a rocky facet look.
  function makeRock() {
    const g = new IcosahedronGeometry(1, 1);
    const pos = g.attributes.position;
    const fract = (x: number) => x - Math.floor(x);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      const n = fract(Math.sin(x * 12.9 + y * 78.2 + z * 37.7) * 43758.5);
      const f = 0.72 + n * 0.5;
      pos.setXYZ(i, x * f, y * f, z * f);
    }
    g.computeVertexNormals();
    return g;
  }

  const material = new MeshStandardMaterial({
    color: new Color('#6f6c66'),
    roughness: 1,
    flatShading: true
  });
  const mesh = new InstancedMesh(makeRock(), material, COUNT);
  mesh.frustumCulled = false;

  const dummy = new Object3D();
  const fract = (x: number) => x - Math.floor(x);
  const rand = (x: number, z: number) => fract(Math.sin(x * 45.23 + z * 19.71) * 24634.63);

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
          const jx = cx + (rand(cx + 5.1, cz) - 0.5) * CELL;
          const jz = cz + (rand(cx, cz + 8.3) - 0.5) * CELL;
          const gy = terrainHeight(jx, jz);
          if (gy > 38 || gy < WATER_LEVEL - 1 || Math.hypot(jx, jz) > MEADOW_R - 5) {
            place = false;
          } else {
            const b = 1.1 + rand(cx + 3.3, cz + 7.7) ** 2 * 4.5; // mostly medium, few big
            dummy.position.set(jx, gy - b * 0.3, jz);
            dummy.scale.set(b, b * (0.6 + rand(cx, cz + 1.1) * 0.35), b);
            dummy.rotation.set((rand(cx, cz) - 0.5) * 0.5, r * 40.0, (rand(cz, cx) - 0.5) * 0.5);
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
