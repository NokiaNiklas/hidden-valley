<script lang="ts">
  import { T } from '@threlte/core';
  import { BoxGeometry, MeshStandardMaterial, Color, Float32BufferAttribute } from 'three';
  import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
  import { BRIDGE, BRIDGE_Z, deckAtZ } from '../bridge';

  const { x: x0, L, W } = BRIDGE;
  const z0 = BRIDGE_Z;

  function paint(geo: any, col: Color) {
    const n = geo.attributes.position.count;
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = col.r;
      a[i * 3 + 1] = col.g;
      a[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new Float32BufferAttribute(a, 3));
    return geo;
  }

  function box(w: number, h: number, d: number, pos: number[], rotX: number, col: Color) {
    const g = new BoxGeometry(w, h, d).toNonIndexed();
    if (rotX) g.rotateX(rotX);
    g.translate(pos[0], pos[1], pos[2]);
    return paint(g, col);
  }

  const plankA = new Color('#b07b3e');
  const plankB = new Color('#a06f38');
  const railCol = new Color('#875f33');
  const postCol = new Color('#75522d');

  const parts: any[] = [];
  const N = 26;
  const plankLen = ((2 * L) / N) * 1.04;
  const slopeAt = (z: number) => Math.atan2(deckAtZ(z + 1) - deckAtZ(z - 1), 2);

  for (let i = 0; i < N; i++) {
    const s = (i + 0.5) / N;
    const z = z0 - L + s * 2 * L;
    const y = deckAtZ(z);
    const rot = -slopeAt(z);
    // plank
    parts.push(box(W, 0.32, plankLen, [x0, y + 0.16, z], rot, i % 2 ? plankA : plankB));
    // side rails
    parts.push(box(0.22, 0.24, plankLen, [x0 - W / 2 + 0.15, y + 1.45, z], rot, railCol));
    parts.push(box(0.22, 0.24, plankLen, [x0 + W / 2 - 0.15, y + 1.45, z], rot, railCol));
  }

  // posts
  for (const s of [0.06, 0.28, 0.5, 0.72, 0.94]) {
    const z = z0 - L + s * 2 * L;
    const y = deckAtZ(z);
    parts.push(box(0.3, 1.6, 0.3, [x0 - W / 2 + 0.15, y + 0.8, z], 0, postCol));
    parts.push(box(0.3, 1.6, 0.3, [x0 + W / 2 - 0.15, y + 0.8, z], 0, postCol));
  }

  const geometry = mergeGeometries(parts);
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
</script>

<T.Mesh {geometry} {material} frustumCulled={false} />
