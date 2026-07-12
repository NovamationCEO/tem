# tem

A web game of **Qubic** — 4×4×4 tic-tac-toe. Two players alternate placing
marks anywhere in a 4×4×4 cube; the first to get four in a row wins. All 76
lines count: rows, columns, and pillars, diagonals within any plane, and the
four space diagonals that cut corner-to-corner through the cube.

The board is shown as four flat 4×4 layer grids. Hovering a cell highlights
the same position on every layer, which makes vertical and cross-layer lines
easy to read. Fully playable with the keyboard: Tab to the board, arrows to
move within a layer, `[` / `]` (or PageUp/PageDown) to switch layers,
Enter/Space to place a mark.

A rotatable WebGL view of the cube sits beside the flat grids: drag to orbit,
scroll to zoom, and use the "Spread layers" slider to expand the lattice on
every axis — opening sight lines so interior cells are visible and clickable.
Each layer has its own color (matching the swatches on the flat-grid labels)
with a faint platform under it, so heights stay readable as marks accumulate. It mirrors the game live — hovering highlights
the same column in both views, and wins draw a line through the four cells in
space. You can play in either view: clicking a cell in the cube places a mark
(a ghost preview shows where), with the flat grids as the keyboard-accessible
equivalent.

Undo steps back one move at a time (including out of a finished game). The
"Show threats" toggle marks every empty cell that would complete four-in-a-row
with a dot in the threatening player's color — handy while learning, off by
default; the preference is remembered.

Runs entirely in the browser — no server, no accounts. `npm run build` emits
static files deployable to any static host.

## Development

Requires Node 24 (`.nvmrc`).

```sh
npm install
npm run dev        # dev server with HMR
npm test           # unit tests (Vitest)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint
```

## Architecture

- `src/game/` — pure game logic (no React): board model, programmatic
  generation of the 76 winning lines, move application, win/draw detection.
  Everything is unit-tested, including exhaustive win coverage of all 76 lines.
- `src/App.tsx`, `src/Board.tsx` — thin React UI over a single `GameState`
  value.

Roadmap and ticket history live in `docs/`.
