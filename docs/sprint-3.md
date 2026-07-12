# Sprint 3 — WebGL 3D companion view (option D completed)

**Goal:** a synchronized, rotatable 3D view of the cube next to the flat
grids. The flat grids remain the input device; the 3D view is for spatial
comprehension. Built with three.js via react-three-fiber + drei.

### T16. Dependencies and 3D scene ✅ done
`three`, `@react-three/fiber`, `@react-three/drei`. `src/Cube3D.tsx` renders
the 4×4×4 lattice: small translucent boxes for empty cells, colored spheres
for marks (player colors matching the 2D board). Layers stack along the
vertical axis (layer 1 at the bottom). Three.js libs split into their own
build chunk.

### T17. State sync and cross-view hover ✅ done
The 3D view consumes the same `GameState` — no logic of its own. Hover state
lifts from `Board` to `App`: hovering a cell on any flat grid highlights the
full vertical column in 3D (matching the 2D cross-layer highlight). On a win,
the four winning cells brighten, the rest dim, and a line is drawn through
the winning four in space — space diagonals finally look like what they are.

### T18. Camera and explode control ✅ done
Drag to orbit (drei `OrbitControls`, zoom clamped, no pan). A "Spread layers"
slider separates the four layers vertically so interior cells are visible —
the interaction that makes a 3D Qubic board readable.

### T19. Layout, docs, verification ✅ done
Flat grids and 3D view side by side on wide screens, stacked on narrow. The
3D canvas is `aria-hidden` (the flat board remains the accessible interface).
README/CLAUDE.md updated. Browser-verified: marks appear in 3D as they are
played, hover column lights up, win line renders, spread slider works, no
console errors.
