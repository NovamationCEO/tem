# tem

A web-based game for up to two players who alternate choosing moves until one wins.
Runs entirely in the browser (front-end only) so it can be hosted as static files
(GitHub Pages / Cloudflare Pages / Netlify) with no server.

The game is Qubic: 4×4×4 tic-tac-toe, win = any 4 in a row (76 winning lines,
including plane diagonals and the 4 space diagonals). Hot-seat play with the
flat four-layer-grid UI ("option A") is complete — see `docs/sprint-1.md`.
Sprint 2 (`docs/sprint-2.md`) added an undo stack (`src/game/history.ts`) and
a toggleable threat-highlighting option. Sprint 3 (`docs/sprint-3.md`) added
the WebGL 3D companion view (`src/Cube3D.tsx`, react-three-fiber + drei),
and sprint 4 (`docs/sprint-4.md`) made it clickable via raycast picking
(invisible hitboxes, drag-vs-click delta guard, ghost preview). Both views
accept input and share hover state; the flat grids remain the accessible
path. Online multiplayer is planned for later. An AI opponent is planned:
`docs/ai-options.md` surveys the approaches (fixed heuristic → alpha-beta
with bitboards → threat-space search) and the recommended roadmap; no AI
code exists yet. Coordinate convention: flat board index = x + 4y + 16z, where z selects
the layer grid; all 76 lines are generated programmatically in
`src/game/lines.ts` (never hand-typed).

## Stack

- Node >= 24 (`.nvmrc`), npm
- Vite 8 + React 19, TypeScript (strict), ESLint flat config with typescript-eslint
- Vitest for unit tests

## Commands

- `npm run dev` — dev server with HMR
- `npm run build` — typecheck (`tsc -b`) then bundle to `dist/`
- `npm test` — run unit tests once (`npm run test:watch` for watch mode)
- `npm run lint` — ESLint
- `npm run typecheck` — typecheck only

## Architecture

- `src/game/` — pure game logic, no React or DOM. All rules are pure functions
  that take a `GameState` and return a new one. Unit-test everything here;
  tests live next to the code as `*.test.ts`.
- `src/App.tsx` etc. — React UI only: renders state, dispatches moves.
  Keep rules out of components so the game core stays testable and could later
  be reused for online play (e.g. WebRTC) without changes.
