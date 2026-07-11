# Sprint 1 — Playable hot-seat Qubic (flat layer grids)

**Sprint goal:** Two people sharing a screen can play a complete, correct game of
4×4×4 tic-tac-toe (Qubic) using the flat four-grid UI (option A), with wins and
draws detected and displayed. Ships as a static build.

**Out of scope (later sprints):** online multiplayer, 3D companion view (options
B/C), AI opponent, sound, animations beyond basic win-line highlight.

**Definition of done (whole sprint):** `npm run build`, `npm run lint`, and
`npm test` all pass; a full game can be played start-to-finish in the browser
with no console errors; win detection is exhaustively tested against all 76
lines.

---

## Epic 1 — Game engine (`src/game/`, pure functions, no React)

### T1. Board representation and coordinates ✅ done
Replace the placeholder `state.ts` with the real model.
- `Player = 1 | 2`, `Cell = Player | null`, board = flat `Cell[]` of length 64.
- `Coord = { x: number; y: number; z: number }` (each 0–3); `coordToIndex` /
  `indexToCoord` helpers. Convention: `z` selects the layer (which flat grid),
  `x`/`y` position within a layer. Document this in the module.
- `GameState = { board, status, moves }`, `newGame()` returns empty board,
  player 1 to move.

**Accept:** round-trip property test `indexToCoord(coordToIndex(c)) = c` for all
64 coords; `newGame` state shape tested. **Est: S. Deps: none.**

### T2. Win-line generation ✅ done
Generate all winning lines programmatically — no hand-typed line tables.
- For each of the 13 canonical direction vectors `(dx,dy,dz) ∈ {-1,0,1}³`
  (excluding zero and mirror duplicates), emit a line from every start cell
  where `start − dir` is out of bounds and `start + 3·dir` is in bounds.
- Export `LINES: number[][]` (76 lines × 4 cell indices), computed once at
  module load. Also export `LINES_BY_CELL: number[][]` (for each of the 64
  cells, which line ids pass through it) — the UI and future threat logic
  both need it.

**Accept:** exactly 76 lines; per-category counts verified in tests
(48 axis-aligned, 24 plane diagonals, 4 space diagonals); the three examples
from the design conversation each appear: `[0,0,0]→[3,3,3]` space diagonal,
`[0,1,0]→[0,1,3]` axis line, `[0,0,0]→[3,0,3]` plane diagonal; every cell
appears in at least 7 lines; no duplicate lines. **Est: M. Deps: T1.**

### T3. Move application
- `applyMove(state, index): GameState` — returns a new state (no mutation).
  Rejects (returns state unchanged, or a typed error result — decide in
  implementation review) when: cell occupied, game already won/drawn, index
  out of range.
- On success: places current player's mark, increments `moves`, delegates to
  win/draw evaluation (T4) to compute the next `status`.

**Accept:** tests for legal move, occupied cell, move after game over,
alternation across a sequence of moves. **Est: S. Deps: T1.**

### T4. Win and draw detection
- After a move at cell `i`, check only `LINES_BY_CELL[i]` (not all 76 lines).
- Win → `status = { kind: 'won', winner, line }` where `line` is the four
  winning cell indices (UI needs it for highlighting).
- All 64 cells filled with no win → `{ kind: 'draw' }`.

**Accept:** exhaustive test — for each of the 76 lines, play a scripted game
where player 1 completes that line and assert the win and the reported line;
draw test with a known full non-winning board; test that a win on the 64th
move reports win, not draw. **Est: M. Deps: T2, T3.**

### T5. Cell/line queries for the UI
- `winningLine(state): number[] | null`
- `linesThrough(index): number[][]` (thin wrapper over `LINES_BY_CELL`).
- Stretch (only if sprint is ahead): `threats(state, player)` — lines with
  three of `player`'s marks and one empty cell, for future hint UI.

**Accept:** unit tests for both queries. **Est: S. Deps: T2, T4.**

---

## Epic 2 — Flat-grid UI (React, `src/`)

### T6. Remove scaffold, app shell
- Delete Vite demo content from `App.tsx`, `App.css`, unused assets
  (`hero.png`, logos), and the icons/links sections.
- App shell: title bar, main board area, status bar (whose turn / result),
  "New game" button wired to `newGame()`.
- Game state lives in `App` via `useState<GameState>` (no state library —
  the whole game is one value).

**Accept:** app renders shell with empty board state; lint/build clean with
no leftover scaffold imports. **Est: S. Deps: T1.**

### T7. Board rendering — four layer grids
- `<Board>` renders four `<LayerGrid z={0..3}>` side by side (wrap 2×2 under
  ~700 px). Each layer labeled (z = 0–3).
- Each cell is a real `<button>` (44 px+ touch target) showing ⨯ / ◯ or empty.
  Distinct colors for the two players; occupied and empty states visually
  distinct.
- Pure presentation: takes `GameState` + `onCellClick(index)` props. No game
  logic in components.

**Accept:** 64 buttons render; marks appear per state; renders correctly at
mobile width. **Est: M. Deps: T6.**

### T8. Move input and turn flow
- Click empty cell → `applyMove`; occupied cells / finished game are no-ops
  (button `disabled` + `aria-disabled`).
- Status bar shows current player with their color; after game over, shows
  "Player N wins" or "Draw".

**Accept:** full hot-seat game playable by clicking; illegal clicks do
nothing; manual playthrough of a known win line works. **Est: S. Deps: T3, T7.**

### T9. Cross-layer highlight (the option-A signature feature)
- Hovering (or keyboard-focusing) a cell highlights the same `(x,y)` cell on
  all four layers — this is what makes vertical/cross-board lines legible.
- Touch devices: skip hover, no degradation.

**Accept:** hover cell on layer 1 → matching cells tinted on layers 0/2/3;
highlight clears on leave; no highlight while a win is displayed. **Est: S.
Deps: T7.**

### T10. Win/draw presentation
- On win: the four winning cells highlighted (use `status.line` from T4),
  other cells dimmed, input blocked, status bar announces winner.
- On draw: status bar announces draw.
- "New game" resets cleanly at any point.

**Accept:** manual test of an axis win, a plane-diagonal win, and a
cross-board space-diagonal win (the hard-to-see case — this is the UX we're
proving); reset works mid-game and post-game. **Est: S. Deps: T8, T9.**

### T11. Keyboard navigation and a11y pass
- Arrow keys move focus within a layer; PageUp/PageDown (or [ / ]) move
  between layers; Enter/Space places a mark.
- `aria-label` per cell ("layer 2, row 1, column 3, empty"); status bar is an
  `aria-live` region announcing turns and results.

**Accept:** complete game playable with keyboard only; VoiceOver spot-check
announces moves and the result. **Est: M. Deps: T8.**

---

## Epic 3 — Wrap-up

### T12. Docs and deploy readiness
- Update `CLAUDE.md` (game rules now defined — 4×4×4, 76 lines, coordinate
  convention) and `README.md` (what the game is, how to run/test).
- Verify `npm run build` output works via `npm run preview` (static-host
  ready). Actual hosting setup deferred until there's something worth sharing.
- First git commits happen at natural checkpoints throughout the sprint
  (engine complete, UI playable, sprint done) — not deferred to the end.

**Accept:** docs match reality; preview build plays a full game. **Est: S.
Deps: all.**

---

## Sequencing

```
T1 → T2 → T4 → T5
T1 → T3 → T4
T1 → T6 → T7 → T8 → T9 → T10
              T8 → T11
all → T12
```

Engine (T1–T5) lands first and is fully tested before UI work begins — UI
tickets then consume a trusted API. T6 can start in parallel with T2–T5 if
desired, since it only needs T1's types.

## Risks / open decisions

- **Reject style for illegal moves (T3):** silent no-op vs. typed result.
  Leaning silent no-op for hot-seat (misclicks are obvious); revisit for
  online play where a rejected move must be signaled.
- **Layer arrangement (T7):** side-by-side row vs. 2×2 grid vs. the old
  diagonal stack — decide with real rendering in front of us; cheap to change.
- **Marks (T7):** ⨯/◯ glyphs vs. colored discs; pick during styling, both fit
  the same cell component.
- **Undo:** deliberately excluded from this sprint; state is a single value so
  adding a history stack later is trivial.
