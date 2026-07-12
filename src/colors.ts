/**
 * Layer shade ramps, indexed by z (0 = layer 1 = TOP of the cube, matching
 * the first flat grid; 3 = layer 4 = bottom). Elevation is encoded as
 * lightness: near-white at the top fading to dark at the bottom, and player
 * marks use lighter/darker versions of their color the same way. Also used
 * for the layer-label swatches on the flat grids.
 */
export const EMPTY_RAMP = ['#f2f1f5', '#bebdc7', '#888792', '#55545e'] as const
export const P1_RAMP = ['#ddd0fe', '#a78bfa', '#6d28d9', '#340e86'] as const
export const P2_RAMP = ['#b6f8e5', '#2dd4bf', '#0e8478', '#063f3a'] as const
