import { describe, it } from 'vitest'
import {
  formatLadder,
  heuristicAgent,
  roundRobin,
  searchAgent,
  type Agent,
} from './selfplay.ts'

/**
 * Full-ladder Elo calibration. This is a *report*, not a pass/fail test, and
 * it plays thousands of games — so it is skipped by default and only runs when
 * CALIBRATE is set:
 *
 *   npm run calibrate                 # defaults below
 *   CALIBRATE_GAMES=500 npm run calibrate
 *
 * Read the printed table: pick which rungs to ship so the Elo gaps land
 * ~150–200 apart (docs/ai-options.md §"Difficulty design"). The search rungs
 * are measured at fixed *depth* for reproducibility; map the chosen depths to
 * wall-clock `budgetMs` afterwards by timing those depths on target hardware.
 */

// The field to measure. Heuristic levels 1–2 are the shipped weak rungs; the
// search depths bracket the current level-3/4 time budgets. Edit freely.
const ROSTER: Agent[] = [
  heuristicAgent(1),
  heuristicAgent(2),
  heuristicAgent(3),
  heuristicAgent(4),
  searchAgent(1),
  searchAgent(2),
  searchAgent(3),
  searchAgent(4),
]

// Read env without depending on @types/node (the app tsconfig omits it).
const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } })
    .process?.env ?? {}

const GAMES_PER_ORDERING = Number(env.CALIBRATE_GAMES ?? 100)

describe.runIf(env.CALIBRATE)('AI ladder calibration', () => {
  it(
    'measures relative Elo across the difficulty ladder',
    () => {
      const pairings = (ROSTER.length * (ROSTER.length - 1)) / 2
      const total = pairings * GAMES_PER_ORDERING * 2
      let lastPct = -1
      const result = roundRobin(ROSTER, {
        gamesPerOrdering: GAMES_PER_ORDERING,
        onProgress: (played) => {
          const pct = Math.floor((100 * played) / total)
          if (pct !== lastPct && pct % 10 === 0) {
            lastPct = pct
            console.log(`  …${pct}% (${played}/${total})`)
          }
        },
      })
      console.log(`\n${formatLadder(result)}\n`)
    },
    10 * 60_000,
  )
})
