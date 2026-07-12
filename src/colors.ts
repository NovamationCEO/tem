/**
 * One distinct hue per layer (z = 0–3), used for the empty-cell lattice and
 * layer platforms in the 3D view and the layer-label swatches on the flat
 * grids. Deliberately distinct from the player colors (purple/teal) and the
 * win highlight (green).
 */
export const LAYER_COLORS = [
  '#38bdf8', // layer 1 — sky
  '#fbbf24', // layer 2 — amber
  '#f472b6', // layer 3 — pink
  '#ef4444', // layer 4 — red
] as const
