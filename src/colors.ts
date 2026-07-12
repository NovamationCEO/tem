/**
 * Layer shade ramps, indexed by z (0 = bottom layer, 3 = top layer).
 * Elevation is encoded as lightness: near-white at the top fading to dark
 * gray at the bottom, and player marks use lighter/darker versions of their
 * color the same way. Also used for the layer-label swatches on the flat
 * grids.
 */
export const EMPTY_RAMP = ['#55545e', '#888792', '#bebdc7', '#f2f1f5'] as const
export const P1_RAMP = ['#5b21b6', '#7c3aed', '#a78bfa', '#cdbdfd'] as const
export const P2_RAMP = ['#0c5d57', '#0f9488', '#2dd4bf', '#99f6e4'] as const
