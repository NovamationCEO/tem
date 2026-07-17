import { describe, it } from 'vitest'
import {
  formatLadder,
  heuristicAgent,
  oracleAgent,
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

// The six shipped rungs (see LADDER in index.ts), measured on one scale so the
// printed Elo maps directly to the difficulty levels players pick.
const ROSTER: Agent[] = [
  heuristicAgent(1), // level 1
  heuristicAgent(2), // level 2
  heuristicAgent(3), // level 3
  searchAgent(2), //    level 4
  searchAgent(4), //    level 5
  oracleAgent(8, 500_000), // level 6
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
    180 * 60_000,
  )
})
