# tem

A web-based game for up to two players who alternate choosing moves until one wins.
Runs entirely in the browser (front-end only) so it can be hosted as static files
(GitHub Pages / Cloudflare Pages / Netlify) with no server. Game rules are not yet
defined — the current game module is a placeholder turn-alternation core.

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
