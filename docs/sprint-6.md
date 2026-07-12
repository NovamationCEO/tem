# Sprint 6 — AI opponent, phase 2: alpha-beta search

**Goal:** levels 3–4 move from the one-ply heuristic to real lookahead
(`docs/ai-options.md` option 2), running in a Web Worker on a time budget.
Levels 1–2 keep the phase-1 heuristic (their charm is missing things).

### T30. Incremental search position ✅ done
`src/game/ai/search.ts`. A `Position` with make/unmake: board array plus
per-line mark counts for both players (updated in O(lines-through-cell)),
Zobrist hashing (two 32-bit lanes folded to a 53-bit map key), explicit turn.
Win/threat detection reads the count arrays — no line rescanning.

### T31. Negamax alpha-beta with Qubic-shaped pruning ✅ done
- Node entry: side to move with a live 3-line → immediate win score
  (mate-in-N scored as WIN − ply so faster wins win ties).
- **Forced-move restriction:** if the opponent has live 3-lines, the only
  moves searched are the blocking cells (winning was already handled) — the
  double-threat loss emerges naturally one ply deeper. This collapses the
  branching factor exactly where Qubic's forcing chains live.
- Forced positions (single legal reply) extend: depth is not decremented.
  Depth-0 nodes under threat keep resolving forced lines instead of standing
  pat — a cheap quiescence that respects check chains.
- Transposition table with exact/lower/upper flags (mate scores not stored);
  TT move tried first. Quiet-move ordering: dynamic threat-aware scores near
  the root, static centrality (lines-through-cell) deeper.
- Leaf eval: per-line nonlinear weights (2/12/96), dead lines zero, from the
  side to move's perspective.

### T32. Iterative deepening, budgets, and difficulty ✅ done
`searchBestMove(state, { budgetMs, maxDepth, jitter }, rand)`: deepen until
the time budget expires (abort via exception, keep the last completed
depth), root moves re-ordered by the previous iteration, stop early on a
proven win. `jitter` picks uniformly among root moves within a score margin
of the best (never jitters away a forced win). Level mapping in
`src/game/ai/index.ts`: 1–2 heuristic; 3 = 60ms + jitter 16; 4 = 350ms,
argmax.

### T33. Web Worker ✅ done
`worker.ts` + `client.ts`: `requestMove(state, level)` posts the board to a
module worker and resolves with the chosen move, so Expert's 350ms think
never blocks the UI (falls back to synchronous choice where Worker is
unavailable). The UI swaps one import; the effect and guards are unchanged.

### T34. Tests and verification ✅ done
Fixed-depth (deterministic) tests: win-in-1, block, win-over-block, mate-in-3
via fork (attacking side finds it; defending side blocks the fork cell),
legal full self-play game. Strength gate: search (30ms) beats the phase-1
level-4 heuristic in at least 4 of 6 alternating-color games. Browser: Expert
responds promptly, worker request visible, no console errors.
