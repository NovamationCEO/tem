/**
 * Layer shade ramps, indexed by z (0 = bottom layer, 3 = top layer).
 * Elevation is encoded as lightness: near-white at the top fading to dark
 * gray at the bottom, and player marks use lighter/darker versions of their
 * color the same way. Also used for the layer-label swatches on the flat
 * grids.
 */
export const EMPTY_RAMP = ['#55545e', '#888792', '#bebdc7', '#f2f1f5'] as const
export const P1_RAMP = ['#340e86', '#6d28d9', '#a78bfa', '#ddd0fe'] as const
export const P2_RAMP = ['#063f3a', '#0e8478', '#2dd4bf', '#b6f8e5'] as const
