<script lang="ts">
  import { T, useThrelte, useTask } from '@threlte/core';
  import {
    CylinderGeometry,
    IcosahedronGeometry,
    MeshStandardMaterial,
    InstancedMesh,
    Object3D,
    Color,
    Vector3,
    Quaternion,
    Matrix4,
    Float32BufferAttribute
  } from 'three';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { terrainHeight, WATER_LEVEL, MEADOW_R } from '../shaders/noise';

  const CELL = 12;
  const GRID = 60; // covers ±360 units around the camera
  const COUNT = GRID * GRID;
  const LOD_D = 210; // near/far LOD switch distance (hidden in the haze)

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

  const bark = new Color(0.34, 0.24, 0.15);
  const leaf = (v: number) => new Color(0.2 + v * 0.12, 0.4 + v * 0.14, 0.16 + v * 0.08);

  function branch(from: number[], to: number[], r0: number, r1: number) {
    const dir = new Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const len = dir.length();
    const geo = new CylinderGeometry(r1, r0, len, 5).toNonIndexed().translate(0, len / 2, 0);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().normalize());
    const m = new Matrix4().makeRotationFromQuaternion(q).setPosition(from[0], from[1], from[2]);
    geo.applyMatrix4(m);
    return paint(geo, bark);
  }

  const sideBlobs: number[][] = [
    [2.4, 5.8, 0.4, 1.9, 0.3],
    [-2.2, 5.6, -0.6, 1.9, 0.3],
    [0.6, 5.4, 2.3, 1.7, 0.2],
    [-0.5, 5.5, -2.2, 1.6, 0.25]
  ];
  const topBlob = [0.1, 7.0, 0.1, 2.6, 0.85];

  function buildHigh() {
    const parts = [
      paint(new CylinderGeometry(0.16, 0.42, 5.2, 10).toNonIndexed().translate(0, 2.6, 0), bark)
    ];
    for (const [x, y, z, r, v] of sideBlobs) {
      parts.push(branch([0, y - 2.6, 0], [x, y, z], 0.16, 0.07));
      parts.push(paint(new IcosahedronGeometry(r, 2).toNonIndexed().translate(x, y, z), leaf(v)));
    }
    const [tx, ty, tz, tr, tv] = topBlob;
    parts.push(paint(new IcosahedronGeometry(tr, 2).toNonIndexed().translate(tx, ty, tz), leaf(tv)));
    return mergeGeometries(parts);
  }

  function buildLow() {
    const parts = [
      paint(new CylinderGeometry(0.2, 0.42, 5.2, 6).toNonIndexed().translate(0, 2.6, 0), bark)
    ];
    const blobs: number[][] = [
      [0.1, 7.0, 0.1, 2.7, 0.7],
      [1.7, 5.7, 0.3, 1.8, 0.3],
      [-1.6, 5.6, -0.4, 1.7, 0.3]
    ];
    for (const [x, y, z, r, v] of blobs) {
      parts.push(paint(new IcosahedronGeometry(r, 1).toNonIndexed().translate(x, y, z), leaf(v)));
    }
    return mergeGeometries(parts);
  }

  const mat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const meshHigh = new InstancedMesh(buildHigh(), mat, COUNT);
  const meshLow = new InstancedMesh(buildLow(), mat, COUNT);
  meshHigh.frustumCulled = false;
  meshLow.frustumCulled = false;

  const dummy = new Object3D();
  const hidden = new Object3D();
  hidden.position.set(0, -9999, 0);
  hidden.scale.setScalar(0);
  hidden.updateMatrix();

  const fract = (x: number) => x - Math.floor(x);
  const rand = (x: number, z: number) => fract(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453);

  const fwdV = new Vector3();
  let lastCX = NaN;
  let lastCZ = NaN;
  let lastYaw = NaN;

  function rebuild(camX: number, camZ: number, fdx: number, fdz: number) {
    const snapX = Math.round(camX / CELL) * CELL;
    const snapZ = Math.round(camZ / CELL) * CELL;
    let idx = 0;
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const cx = snapX + (i - GRID / 2) * CELL;
        const cz = snapZ + (j - GRID / 2) * CELL;
        const r = rand(cx, cz);

        let high = hidden.matrix;
        let low = hidden.matrix;

        if (r < 0.1) {
          const jx = cx + (rand(cx + 1.3, cz) - 0.5) * CELL * 0.8;
          const jz = cz + (rand(cx, cz + 2.7) - 0.5) * CELL * 0.8;
          const gy = terrainHeight(jx, jz);
          const slope =
            Math.abs(terrainHeight(jx + 1.5, jz) - gy) + Math.abs(terrainHeight(jx, jz + 1.5) - gy);

          const ok = gy > WATER_LEVEL + 2 && Math.hypot(jx, jz) < MEADOW_R - 5 && slope < 3.0;
          if (ok) {
            const tx = jx - camX;
            const tz = jz - camZ;
            const dist = Math.hypot(tx, tz);
            // view-cone cull: keep near trees, drop ones behind the camera
            const inView = dist < 45 || (tx * fdx + tz * fdz) / (dist || 1) > 0.05;
            if (inView) {
              const s = 2.1 + rand(cx + 9.1, cz + 4.2) * 1.7;
              dummy.position.set(jx, gy - 0.4, jz);
              dummy.scale.setScalar(s);
              dummy.rotation.set(0, r * 40.0, 0);
              dummy.updateMatrix();
              if (dist < LOD_D) high = dummy.matrix.clone();
              else low = dummy.matrix.clone();
            }
          }
        }

        meshHigh.setMatrixAt(idx, high);
        meshLow.setMatrixAt(idx, low);
        idx++;
      }
    }
    meshHigh.instanceMatrix.needsUpdate = true;
    meshLow.instanceMatrix.needsUpdate = true;
  }

  useTask(() => {
    const c = camera.current.position;
    camera.current.getWorldDirection(fwdV);
    const len = Math.hypot(fwdV.x, fwdV.z) || 1;
    const fdx = fwdV.x / len;
    const fdz = fwdV.z / len;
    const sx = Math.round(c.x / CELL);
    const sz = Math.round(c.z / CELL);
    const yaw = Math.round(Math.atan2(fdz, fdx) / 0.35); // rebuild every ~20° turn
    if (sx !== lastCX || sz !== lastCZ || yaw !== lastYaw) {
      lastCX = sx;
      lastCZ = sz;
      lastYaw = yaw;
      rebuild(c.x, c.z, fdx, fdz);
    }
  });
</script>

<T is={meshHigh} />
<T is={meshLow} />
