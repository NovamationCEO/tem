# AI options for playing Qubic

Context file: approaches for a computer opponent, from the legacy heuristic to
modern methods, with a recommended roadmap. Everything here fits the project
constraint — front-end only, all computation in the browser.

## The legacy algorithm (baseline, ~2005)

For each empty cell, take every line through it and score the line +1 per
friendly mark, −1 per enemy mark. A +3 line is a win — play it. A −3 line is
an opponent win — block it. Otherwise sum the line scores per cell (as if the
cell were friendly) and pick randomly among the top scorers. Difficulty:
lower levels have an escalating chance of ignoring the best tier of moves for
the second-best, then third, etc.

### What it gets right
- Never misses its own immediate win; never fails to block a lone immediate
  threat (at top difficulty).
- Cell centrality falls out for free: corners/centers sit on 7 lines, so
  they naturally score higher early.
- Cheap, instant, easy to reason about.

### Blind spots (worth fixing regardless of approach)
1. **Dead lines are miscounted.** A line with marks from both players can
   never be won by anyone, yet "2 friendly + 1 enemy" still contributes +1.
   Dead lines should contribute exactly 0.
2. **Linear scoring can't see forks.** Two lines each with 2 friendly marks
   crossing at an empty cell = a *double-threat setup*, which is how Qubic is
   actually won. Summing sees "+2 +2 = 4", the same as two unrelated lines.
   Threats need to be counted as *events per cell*, not averaged into a sum.
3. **One ply deep.** It cannot see that its chosen move *lets the opponent
   create* a double threat next turn, or that a forcing sequence three moves
   long wins outright. Qubic is overwhelmingly a game of forced sequences of
   checks, so this is the biggest weakness by far.
4. **Two simultaneous enemy threats confuse the block rule.** With two −3
   lines it blocks one at random and loses; recognizing "opponent has a
   double threat → position already lost, play the least-bad check" needs
   explicit handling.
5. **Tier-skipping difficulty feels robotic.** Skipping the whole best tier
   produces occasional inexplicable blunders rather than plausibly-human
   weaker play.

## Background fact that shapes everything

**Qubic is solved: the first player wins with perfect play.** Proved by
Oren Patashnik (1980, ~2,929 strategic first-player moves verified by
brute-force checking), later re-proved elegantly by Victor Allis using
threat-space search (Qubic chapter of his 1994 thesis *Searching for
Solutions in Games and Artificial Intelligence*). Two consequences:

- The literature's key insight: winning play is dominated by **chains of
  checks** — 3-in-a-row threats the opponent *must* answer — culminating in a
  double threat. Any strong AI should search forcing moves much deeper than
  quiet moves.
- A maximally strong AI moving first *always* wins. For UX, the strongest
  difficulty is best offered with the AI playing second (or with the top
  level deliberately capped), or it will feel unbeatable — because it is.

## Options, in escalating order of effort

### Option 1 — Modernized heuristic (fix the baseline)
Keep the one-ply structure, repair the evaluation:
- Score each line from a small table indexed by `(friendly, enemy)` counts:
  dead lines (both colors present) = 0; nonlinear weights so a 3-line is
  worth far more than three 1-lines (e.g. 0/1/8/64 for 0/1/2/3 friendly in a
  live line).
- Explicit tiers before any scoring: my win → block single enemy win →
  create a double threat → block an enemy double-threat *setup* → best sum.
- The engine already exposes what this needs: `LINES_BY_CELL` and
  `threats()` in `src/game/`.

Effort: small. Strength: solid casual opponent, still tactically shallow.
This is the right *first sprint* and becomes the eval function for Option 2
and the playout policy for Option 3.

### Option 2 — Alpha-beta search (the classical workhorse)
Minimax with alpha-beta pruning over the real game tree, Option 1's fixed
eval at the leaves.
- **Bitboards make it fast:** one 64-bit occupancy mask per player (fits a
  `BigInt`, or two `Uint32`s for speed); each of the 76 lines is a
  precomputed mask; win/threat detection becomes AND/popcount. Thousands of
  times faster than array scanning — this is what buys depth in JS.
- **Move ordering is everything:** wins, blocks, checks (moves creating a
  3-line), then heuristic order. With good ordering, 6–8 plies is
  comfortable in ~100ms in a browser.
- **Iterative deepening + transposition table** (Zobrist hashing) gives an
  anytime algorithm: search until the time budget expires, play the best so
  far. Difficulty maps naturally to time/depth budget.
- **Extend forcing sequences:** when a move is a check, search its line
  deeper (checks are nearly free to extend because the reply is forced).
  This single rule captures most of Qubic's tactical character.
- Run in a **Web Worker** so the UI never blocks.

Effort: moderate. Strength: beats virtually all casual human play at modest
budgets. This is the recommended core.

### Option 3 — Monte Carlo Tree Search (MCTS/UCT)
Random playouts guided by upper-confidence bounds; no hand-tuned eval needed.
- Playouts should not be uniformly random: "always take a win, always block
  a lone threat" playout policy (Option 1's tiers, cheap via bitboards)
  dramatically improves quality.
- Anytime by construction; simulations-per-move is a smooth difficulty knob.
- In practice, for a strongly tactical game like Qubic, plain MCTS is
  *weaker* than alpha-beta with check extensions at equal budget — random
  playouts wash out forced sequences. Worth knowing, not the best fit here.

Effort: moderate. Mainly interesting as a stepping stone to Option 5.

### Option 4 — Threat-space search (the Qubic-native specialist)
Allis' technique: search *only* threat moves (checks and double-threat
creations), treating the opponent's replies as forced. Because the branching
factor collapses, forced wins 10–20 plies deep are found in milliseconds.
- Used as an oracle bolted onto Option 2: every turn, first ask "is there a
  forced win from here?" — if yes, execute the chain; if no, fall back to
  normal search.
- This is what makes the AI play the *theoretically correct* relentless
  attacking style, and it's the road to effectively perfect play as player 1
  (optionally backed by a small opening book; the cube's 192 symmetries
  shrink it).

Effort: moderate-plus (subtle correctness details around defensive
counter-threats). Strength: near-perfect attacker; the "expert" tier.

### Option 5 — Self-play neural network (AlphaZero-lite)
Train a small policy+value net by self-play with MCTS offline (Python), ship
the weights, run inference in-browser via onnxruntime-web or TensorFlow.js
(WASM/WebGPU). The board encodes as two 4×4×4 binary planes; a ~100k-param
net is plenty for Qubic.
- Front-end-only constraint holds: training happens offline; the shipped
  site just does inference (~1 MB of weights).
- Honest assessment: for a solved 64-cell game this is *for fun and
  learning*, not necessity — Options 2+4 already reach effectively perfect
  play at a fraction of the complexity. It does produce the most
  human-flavored positional play at low simulation counts.

Effort: large (offline training pipeline, model export, browser inference).

## Difficulty design (applies to every option)

Replace tier-skipping with two modern, smoother knobs:

1. **Budget**: depth / time / simulations per move. Weak levels think
   shallow; strong levels think deep. This produces *plausible* weak play —
   missing deep tactics while still playing naturally.
2. **Temperature**: convert final move scores to probabilities with a
   softmax; low levels sample at high temperature (more spread), top level
   plays argmax. Small, human-feeling inaccuracies instead of cliff-edge
   blunders.
3. **Guardrails per level**: e.g. level 1 may miss even immediate wins
   (temperature applies to everything); level 3+ never misses a win or a
   lone block. Encode these as explicit floors, not emergent behavior.
4. **Calibrate with self-play**: round-robin the candidate settings a few
   thousand games (bitboards make this minutes, runnable in Node or even a
   dev-only browser page), fit Elo, then space levels ~150–200 Elo apart.
   Also the regression harness for any AI change.

## Recommended roadmap for this repo

1. **AI sprint 1:** Option 1 (fixed heuristic) + difficulty via temperature +
   guardrails. Pure functions in `src/game/ai/`, seeded RNG for testable
   determinism, exhaustive unit tests (always-wins, always-blocks,
   fork-preference). Ship a playable "vs computer" mode early.
2. **AI sprint 2:** Bitboard layer + alpha-beta with iterative deepening,
   check extensions, transposition table, Web Worker, time budgets per
   level. Legacy heuristic becomes the eval and the bottom difficulty rungs.
3. **AI sprint 3:** Threat-space search oracle for the top difficulty;
   self-play Elo calibration of the ladder.
4. **Maybe-never:** AlphaZero-lite, for the joy of it.

Interfaces worth pinning now: `chooseMove(state, config, rng) →
Promise<index>` (async from day one so a worker can slot in later without
touching the UI), and `config = { level }` resolving internally to budget +
temperature + guardrails.
