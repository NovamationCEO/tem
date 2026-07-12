import type { GameState } from '../state.ts'
import { pickMove, type Level } from './heuristic.ts'
import type { Rand } from './random.ts'
import { searchBestMove } from './search.ts'

export type { Level }

// Levels 1–2 keep the phase-1 heuristic (their charm is missing things);
// 3–4 use alpha-beta on a time budget. Level 3 adds root jitter so it varies.
const SEARCH_LEVELS: Record<3 | 4, { budgetMs: number; jitter: number }> = {
  3: { budgetMs: 60, jitter: 16 },
  4: { budgetMs: 350, jitter: 0 },
}

export function pickMoveForLevel(
  state: GameState,
  level: Level,
  rand: Rand,
): number {
  if (level <= 2) return pickMove(state, level, rand)
  const config = SEARCH_LEVELS[level as 3 | 4]
  return searchBestMove(
    state,
    { budgetMs: config.budgetMs, jitter: config.jitter },
    rand,
  )
}
