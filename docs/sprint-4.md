# Sprint 4 — Raycast picking in the 3D view

**Goal:** the 3D view becomes an input surface, not just a display. Clicking
a cell in the cube places a mark, with the flat grids staying fully
equivalent (and remaining the accessible path).

### T20. Hitboxes and click handling ✅ done
Each of the 64 cells gets an invisible hitbox mesh (~1.0 units at 1.2
spacing) so targets are much larger than the visible geometry. R3F raycasting
picks the nearest hit; `stopPropagation` ensures exactly one cell fires.
Clicks are ignored when the pointer traveled more than a few pixels between
down and up (`event.delta`), so orbit drags never place marks. Occupied-cell
clicks no-op via the engine, same as the 2D board.

### T21. Hover feedback and ghost preview ✅ done
Pointer-over a cell in 3D drives the same shared hover state as the flat
grids: the (x, y) column lights up in both views. Hovering an empty cell
while playing shows a translucent "ghost" sphere in the current player's
color — you see exactly what you're about to place. Cursor switches to
pointer over cells. Interior cells are reached by spreading layers or
orbiting; that stays the intended mechanism.

### T22. Docs and verification ✅ done
README/CLAUDE.md updated (3D is no longer view-only). Browser-verified:
3D click places the correct mark, orbit drag places nothing, ghost preview
and cross-view column highlight work, no console errors.

### T23. Layer legibility and all-axis spread ✅ done
Feedback: the lattice was hard to parse mid-game, and vertical-only spread
didn't help mouse selection. Each layer now has a distinct hue
(`src/colors.ts`: sky/amber/pink/red) applied to its empty cells and a faint
platform plane beneath it, with matching swatches on the flat-grid layer
labels. The spread slider expands all three axes (extra weight on vertical),
and the camera auto-pulls back to keep the lattice framed. Browser-verified:
an interior cell picked by mouse at spread 0.6.
