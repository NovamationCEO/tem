import type { GameState } from '../state.ts'
import { pickMove, type HeuristicLevel } from './heuristic.ts'
import type { Rand } from './random.ts'
import { searchBestMove } from './search.ts'

/** Public difficulty ladder: 1 (weakest) … 5 (strongest). */
export type Level = 1 | 2 | 3 | 4 | 5

// Rungs calibrated by self-play (`npm run calibrate`); approx Elo in comments,
// each rung ~300 Elo above the last. Levels 1–3 are the instant heuristic
// (weaker levels miss things on purpose); 4–5 are fixed-depth alpha-beta —
// depth-limited, so identical strength on every device — run in a Web Worker.
type Rung =
  | { engine: 'heuristic'; level: HeuristicLevel }
  | { engine: 'search'; depth: number }

const LADDER: Record<Level, Rung> = {
  1: { engine: 'heuristic', level: 1 }, // ~770 Elo
  2: { engine: 'heuristic', level: 2 }, // ~1080
  3: { engine: 'heuristic', level: 3 }, // ~1420
  4: { engine: 'search', depth: 2 }, //   ~1720
  5: { engine: 'search', depth: 4 }, //   ~1980
}

export function pickMoveForLevel(
  state: GameState,
  level: Level,
  rand: Rand,
): number {
  const rung = LADDER[level]
  if (rung.engine === 'heuristic') return pickMove(state, rung.level, rand)
  return searchBestMove(state, { maxDepth: rung.depth }, rand)
}
