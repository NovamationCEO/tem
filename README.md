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
