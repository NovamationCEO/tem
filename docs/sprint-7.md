# Sprint 7 — AI opponent, phase 3: Elo calibration and threat-space search

**Goal:** the last item on the `docs/ai-options.md` roadmap — a self-play Elo
harness to calibrate the difficulty ladder (§"Difficulty design" point 4), and
threat-space search (option 4) as an oracle for a top tier. Along the way the
ladder grew from 4 rungs to 6 and the search dropped wall-clock budgets
entirely.

### T35. Self-play harness ✅ done
`src/game/ai/selfplay.ts`. Pure and headless — no worker, no DOM — so thousands
of games run under Node/Vitest in minutes.
- `Agent = { name, pick(state, rand) }`, built by `heuristicAgent(tier)`,
  `searchAgent(depth, jitter)`, and `oracleAgent(depth, maxNodes)` (the last
  mirrors the level-6 policy so calibration measures the shipped rung exactly).
- `playGame(a, b, seed, openingPlies)` — `a` moves first. The first
  `openingPlies` moves are uniformly random from the same seeded stream.
  **This matters:** a fixed-depth search with `jitter` 0 consumes no RNG, so two
  such agents would replay one identical game forever; random openings
  decorrelate games and are the standard way to sample engine strength.
- `roundRobin(agents, opts)` plays both color assignments equally (Qubic's
  first-mover edge measured ~54% of decisive games, stable across runs) and
  reports W/D/L, score, and Elo per agent.
- Elo via Bradley–Terry fitted by minorization–maximization (Zermelo's
  algorithm) — dependency-free, convergent, draws count as half a win each.
  Strengths are normalized to geometric mean 1, then
  `Elo = anchor + (400/ln10)·ln(gamma)`. Ratings are anchored to the **field
  mean**, so absolute values shift when the roster changes — only intervals are
  comparable across runs.

### T36. Calibration report ✅ done
`src/game/ai/calibrate.test.ts` + `npm run calibrate`. It's a *report*, not a
pass/fail test, and plays thousands of games, so it's gated behind the
`CALIBRATE` env var (`describe.runIf`) and skipped by every normal `npm test`.
`CALIBRATE_GAMES` sets games per ordering. The roster is the six shipped rungs,
measured on one scale so the printed Elo maps straight onto the difficulty
levels players pick. The npm script passes `--disable-console-intercept`:
Vitest v4 buffers `console.log` from passing tests and would swallow the table.
The library itself (`playGame` determinism, Elo ordering/anchoring, tally
consistency) is unit-tested normally and fast in `selfplay.test.ts`.

### T37. Depth-limited search, then node-bounded ✅ done
Sprint 6's `budgetMs` reached a different depth on every machine — fine for the
UI, useless for calibration, and it meant a level's strength depended on the
host. `SearchOptions` is now `{ maxDepth, maxNodes?, jitter? }`: the deadline,
`performance.now()` polling, `SearchAbort`, and its try/catch are all gone.
Iterative deepening stays — not for a time budget, but because it warms the
transposition table and move ordering so the final depth searches fast.

A pure depth limit has an unbounded-cost tail, though: fixed depth 5 with no cap
stretched one calibration run to 75 minutes and would have caused multi-second
hangs in play. `maxNodes` is the fix — node counts are deterministic, so it
bounds worst-case cost *without* breaking cross-machine reproducibility. Levels
4–5 use a pure depth limit; level 6 uses a depth ceiling plus a node budget.

`Position` and `emptyCellOf` are now exported so the oracle shares the same
fast count-array substrate instead of duplicating board logic.

### T38. Threat-space search oracle ✅ done
`src/game/ai/threat.ts`. `findForcedWin(state, opts)` returns the attacker's
chain of forcing moves (head = play now) or `null`; `hasForcedWin` is the
boolean form. It searches **only checks** — moves creating an immediate winning
threat — and treats replies as forced, so branching collapses.
- **Sound, deliberately incomplete.** Every sequence returned is a genuine
  forced win. It won't find wins needing a quiet preparation move, since those
  aren't forcing. That's the right contract for an oracle: trust a "yes",
  fall back to alpha-beta on a "no".
- **Defensive counter-threats** (the subtlety `ai-options.md` flags) are handled
  by testing for an opponent immediate win after *every* attacker move: if they
  can win outright they ignore our threat, so the line is refuted. That single
  check also proves their forced block can never complete a four for them, so no
  separate post-block test is needed.
- Terminal is a double threat (two distinct winning squares); moves are ordered
  most-threats-first so those are found early. Bounded by `maxDepth` (default
  30 attacker moves) and `maxNodes` (default 200k).

### T39. Six-rung ladder ✅ done
`Level` (1–6) now lives in `index.ts` and is the game's difficulty; the
heuristic's own tuning tier was renamed `HeuristicLevel` (1–4) to end the
collision. A single `LADDER` table maps level → rung, and `pickMoveForLevel`
dispatches: heuristic, or oracle-then-search. `App.tsx` names them Beginner /
Casual / Intermediate / Advanced / Expert / Perfect.

### T40. Tests and verification ✅ done
`threat.test.ts` carries three independent nets:
- **Recognition** — immediate completions, one-move forks, empty board (`null`:
  Qubic has no forcing chain from move one), lone-threat non-wins, and
  refutation when the opponent holds their own mate-in-1.
- **Exhaustive soundness** — a verifier that plays the oracle's move and then
  tries *every* legal opponent reply, recursively, requiring the attacker to win
  down every branch. A full proof for the positions it runs on, not a sample;
  applied to the fork and to wins found during a random sweep.
- **Agreement with alpha-beta** — where the oracle claims a win, the attacker
  follows it while the opponent defends with depth-4 alpha-beta; the attacker
  must still win. An unsound oracle fails this.

Browser: each level responds through the worker with no console errors.

## Calibrated ladder

| Level | Name | Rung | Elo | Step |
|------:|------|------|----:|-----:|
| 1 | Beginner | heuristic L1 | ~710 | — |
| 2 | Casual | heuristic L2 | ~1025 | +315 |
| 3 | Intermediate | heuristic L3 | ~1395 | +370 |
| 4 | Advanced | search d2 | ~1735 | +340 |
| 5 | Expert | search d4 | ~2005 | +270 |
| 6 | Perfect | oracle + d8 / 500k nodes | ~2140 | +135 |

## What calibration actually taught us

1. **The shipped 4-level ladder had a ~1045-Elo canyon.** Levels 1–2 (heuristic)
   sat at ~850/1080 while the weakest useful search rung was ~1900 — the old
   level 2→3 step was a wall, not a step. Measuring heuristic tiers 3–4 and
   search depth 1 filled it: heuristic-L4 (~1625) is *stronger* than search-d1
   (~1530), so the two engine families interleave and the ladder is continuous.
   A beginner/advanced mode split turned out to be unnecessary.
2. **The oracle is largely redundant with the engine's check extensions.** At
   equal depth, oracle+d4 beat plain d4 by only ~30 Elo (noise) — sprint 6's
   forced-reply extensions already resolve check chains without spending depth.
   Level 6's +135 over Expert comes from searching *deeper*, not from the
   oracle. It stays for its qualitative guarantee (never misses a provable
   forced win) and as a fast short-circuit, but it is not the strength driver
   the roadmap implied.
3. **Diminishing returns are steep.** search d2→d3→d4 spaced only ~100–150 Elo
   apart; depth past 4 buys little on a 64-cell solved game.

## Follow-ups

- Levels 4–6 are deterministic per position (`jitter` 0, matching calibration).
  Against a varied human that's fine, but the AI opens identically every game
  and a winning line is replayable. `{ maxDepth: 4, jitter: N }` restores
  variety at a small, unmeasured Elo cost.
- The oracle is offense-only. Detecting that the *opponent* has a forced win
  (to pick the least-bad defense) is a natural extension.
- `npm run calibrate` is the regression harness for any future engine change —
  run it before and after.
