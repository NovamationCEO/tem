# Sprint 5 — AI opponent, phase 1: modernized heuristic

**Goal:** a playable "vs computer" mode backed by the fixed one-ply heuristic
from `docs/ai-options.md` (option 1). Pure functions in `src/game/ai/`,
seeded RNG for deterministic tests, async `chooseMove` API so the alpha-beta
worker (phase 2) can slot in without touching the UI.

### T26. Heuristic evaluation and move choice ✅ done
`src/game/ai/heuristic.ts`. Per empty cell, over `LINES_BY_CELL`:
- Dead lines (both colors present) contribute nothing.
- Tier detection: `wins` (3 friendly), `blocks` (3 enemy), `forks` (≥2 lines
  that become threats), `enemyForks` (≥2 enemy threat-setups) — the fork
  tiers are what the 2005 version couldn't see.
- Quiet score: nonlinear weights per live line (offense 1/4/24 for 0/1/2
  friendly; defense 2/12 for 1/2 enemy) — offense weighted ~2× defense since
  checks force replies in Qubic.
Tier order: win → block → create fork → block fork → temperature-sampled
quiet move.

### T27. Difficulty via budget-free knobs: guardrails + temperature ✅ done
`LEVELS` 1–4. Each level sets per-tier obey-probabilities (level 4 = 1.0 for
win/block/forks; level 1 misses wins 40% of the time) and a softmax
temperature over quiet scores (level 4 = argmax, level 1 near-uniform).
Seeded RNG (`mulberry32`) so every test and any bug report is reproducible.

**Accept:** unit tests — always-wins and always-blocks at level 4 (win
preferred over block when both exist); fork creation chosen at level 4;
level 1 sometimes misses a win and sometimes takes it (seeded, deterministic);
same seed → identical full self-play game; AI-vs-AI games terminate legally.

### T28. "vs computer" mode in the UI ✅ done
- Opponent select (Two players / vs Computer) + difficulty select
  (Beginner/Casual/Challenging/Expert), both persisted to localStorage.
- AI plays player 2, moving ~450ms after the human (stale-state guard: the
  pending move applies only if the game hasn't changed under it).
- Undo in AI mode rewinds to the human's turn (pops the AI reply too).
- Status line becomes "Your turn / Computer is thinking… / You win! /
  Computer wins!" in AI mode.

**Accept:** browser-verified — computer answers moves, blocks a 3-in-a-row
at level 4 (in the sense of taking win/block tiers), undo lands on the
human's turn, mode/level survive reload, no console errors.

### T29. Docs ✅ done
README and CLAUDE.md updated; ai-options.md roadmap marked in progress.
