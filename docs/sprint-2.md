# Sprint 2 — Undo and threat highlighting

**Goal:** quality-of-life features on top of the playable baseline.

### T13. Threat detection (engine) ✅ done
`threats(state)` in `src/game/queries.ts`: every empty cell that would
complete four-in-a-row, with the winning player and line. A line is a threat
when it has exactly one empty cell and the other three marks belong to one
player. Finished games have no threats by definition.

**Accept:** unit tests — no threats in a new game; simple threat found;
blocked line is not a threat; double threat (one cell completes two lines)
reports both; the same cell can be a threat for both players; no threats
after a win.

### T14. Undo stack ✅ done
`src/game/history.ts`: game history as an immutable list of `GameState`
(cheap — states are structurally shared). `pushMove`, `undo`, `canUndo`,
`currentState`. Undo steps back one half-move at a time and works after a
win/draw (removes the final move and resumes play). UI: Undo button, disabled
with no history.

**Accept:** unit tests for push/undo/no-op edges; browser-verified.

### T15. Threat highlighting toggle (UI) ✅ done
"Show threats" checkbox. When on, empty threat cells show a colored dot per
threatening player (both players possible on one cell), and the cell's
aria-label announces the winning move. Preference persists in localStorage.
Off by default — it makes the game notably easier, but helps new players.

**Accept:** browser-verified: dot appears when a player has three in a line,
disappears when blocked or toggled off; state survives reload.
