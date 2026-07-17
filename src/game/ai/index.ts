import type { GameState } from '../state.ts'
import { pickMove, type HeuristicLevel } from './heuristic.ts'
import type { Rand } from './random.ts'
import { searchBestMove } from './search.ts'
import { findForcedWin } from './threat.ts'

/** Public difficulty ladder: 1 (weakest) … 6 (strongest). */
export type Level = 1 | 2 | 3 | 4 | 5 | 6

// Rungs calibrated by self-play (`npm run calibrate`); approx Elo in comments.
// Levels 1–3 are the instant heuristic (weaker levels miss things on purpose);
// 4–6 are alpha-beta run in a Web Worker. Levels 4–5 are depth-limited, so
// identical strength on every device; level 6 ("Perfect") is a novelty tier
// that first consults the threat-space oracle — playing any proven forced win
// straight from the chain — then searches as deep as a node budget allows. The
// node budget (not wall-clock) keeps it deterministic across machines while
// bounding worst-case move time.
type SearchRung = {
  engine: 'search'
  depth: number
  oracle?: boolean
  maxNodes?: number
}
type Rung = { engine: 'heuristic'; level: HeuristicLevel } | SearchRung

const LADDER: Record<Level, Rung> = {
  1: { engine: 'heuristic', level: 1 }, // ~710 Elo
  2: { engine: 'heuristic', level: 2 }, // ~1025
  3: { engine: 'heuristic', level: 3 }, // ~1395
  4: { engine: 'search', depth: 2 }, //   ~1735
  5: { engine: 'search', depth: 4 }, //   ~2005
  6: { engine: 'search', depth: 8, oracle: true, maxNodes: 500_000 }, // ~2140
}

export function pickMoveForLevel(
  state: GameState,
  level: Level,
  rand: Rand,
): number {
  const rung = LADDER[level]
  if (rung.engine === 'heuristic') return pickMove(state, rung.level, rand)
  // Ask the oracle first: a proven forced win is played straight from the chain.
  if (rung.oracle) {
    const forced = findForcedWin(state)
    if (forced) return forced[0]
  }
  return searchBestMove(
    state,
    { maxDepth: rung.depth, maxNodes: rung.maxNodes },
    rand,
  )
}
