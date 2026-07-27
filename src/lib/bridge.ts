import { terrainHeight, riverCentre } from './shaders/noise';

// A single stylized bridge spanning the river. The deck-height function is shared
// by the mesh (Bridge.svelte) and the walk collision (WalkController) so you can
// actually walk over it.
export const BRIDGE = {
  x: -120, // world X where the bridge crosses
  L: 34, // half-span across the river (Z)
  W: 6.5, // deck width (X)
  archH: 5.5 // arch rise
};

export const BRIDGE_Z = riverCentre(BRIDGE.x);
const endY0 = terrainHeight(BRIDGE.x, BRIDGE_Z - BRIDGE.L);
const endY1 = terrainHeight(BRIDGE.x, BRIDGE_Z + BRIDGE.L);

/** Height of the walking surface along the arch, or null outside the footprint. */
export function bridgeDeckY(x: number, z: number): number | null {
  const { x: x0, L, W, archH } = BRIDGE;
  const z0 = BRIDGE_Z;
  if (x < x0 - W / 2 || x > x0 + W / 2 || z < z0 - L || z > z0 + L) return null;
  const s = (z - (z0 - L)) / (2 * L);
  return endY0 + (endY1 - endY0) * s + archH * Math.sin(Math.PI * s);
}

/** Deck height for a given z along the centreline (used to build the mesh). */
export function deckAtZ(z: number): number {
  const { L, archH } = BRIDGE;
  const s = (z - (BRIDGE_Z - L)) / (2 * L);
  return endY0 + (endY1 - endY0) * s + archH * Math.sin(Math.PI * s);
}
