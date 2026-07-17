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
path. Online multiplayer is planned for later. Sprints 5–7 (`docs/sprint-5.md`
… `docs/sprint-7.md`) added the AI opponent in `src/game/ai/`, completing the
`docs/ai-options.md` roadmap. The difficulty ladder has six rungs, defined by
the single `LADDER` table in `ai/index.ts`: levels 1–3 use the tiered
heuristic (`heuristic.ts`), 4–6 use alpha-beta (`search.ts`) behind a Web
Worker (`client.ts`/`worker.ts`), and level 6 also consults the threat-space
oracle (`threat.ts`). Seeded RNG throughout. The search is **depth-limited,
never time-limited**, so a level plays identically on every machine; level 6
adds a deterministic node budget to bound worst-case cost. Rung strengths are
measured by self-play Elo (`selfplay.ts`, `npm run calibrate` — the gated
regression harness for any engine change; run it before and after).
Coordinate convention: flat board index = x + 4y + 16z, where z selects
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
- `npm run calibrate` — self-play Elo report for the AI ladder. Skipped by
  `npm test`; takes tens of minutes. `CALIBRATE_GAMES=n` sets games per
  pairing (default 100).

## Architecture

- `src/game/` — pure game logic, no React or DOM. All rules are pure functions
  that take a `GameState` and return a new one. Unit-test everything here;
  tests live next to the code as `*.test.ts`.
- `src/App.tsx` etc. — React UI only: renders state, dispatches moves.
  Keep rules out of components so the game core stays testable and could later
  be reused for online play (e.g. WebRTC) without changes.
