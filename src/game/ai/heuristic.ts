import { LINES, LINES_BY_CELL } from '../lines.ts'
import type { GameState } from '../state.ts'
import type { Rand } from './random.ts'

export type Level = 1 | 2 | 3 | 4

interface LevelConfig {
  /** Probability of taking each tier when it exists. */
  win: number
  block: number
  fork: number
  blockFork: number
  /** Softmax temperature over quiet-move scores; 0 = argmax. */
  temperature: number
}

export const LEVELS: Record<Level, LevelConfig> = {
  1: { win: 0.6, block: 0.5, fork: 0.3, blockFork: 0.2, temperature: 40 },
  2: { win: 0.9, block: 0.8, fork: 0.6, blockFork: 0.5, temperature: 18 },
  3: { win: 1, block: 1, fork: 0.85, blockFork: 0.75, temperature: 8 },
  4: { win: 1, block: 1, fork: 1, blockFork: 1, temperature: 0 },
}

// Nonlinear per-line weights (indexed by mark count in a live line). Offense
// outweighs defense ~2:1 — in Qubic your own checks force replies.
const OFFENSE = [1, 4, 24]
const DEFENSE = [0, 2, 12]

interface CellAnalysis {
  index: number
  /** Lines this move completes (immediate win). */
  wins: number
  /** Enemy wins this move prevents. */
  blocks: number
  /** Threats this move creates (line becomes 3 friendly + 1 empty). */
  forks: number
  /** Threats the ENEMY would create by playing here. */
  enemyForks: number
  score: number
}

function analyze(state: GameState, index: number, me: 1 | 2): CellAnalysis {
  const result: CellAnalysis = {
    index,
    wins: 0,
    blocks: 0,
    forks: 0,
    enemyForks: 0,
    score: 0,
  }
  for (const lineId of LINES_BY_CELL[index]) {
    let friendly = 0
    let enemy = 0
    for (const cell of LINES[lineId]) {
      if (cell === index) continue
      const mark = state.board[cell]
      if (mark === me) friendly++
      else if (mark !== null) enemy++
    }
    if (friendly > 0 && enemy > 0) continue // dead line: nobody can win it
    if (friendly === 3) result.wins++
    if (enemy === 3) result.blocks++
    if (friendly === 2 && enemy === 0) result.forks++
    if (enemy === 2 && friendly === 0) result.enemyForks++
    result.score += enemy === 0 ? OFFENSE[friendly] : DEFENSE[enemy]
  }
  return result
}

function uniformPick<T>(items: readonly T[], rand: Rand): T {
  return items[Math.floor(rand() * items.length)]
}

/** Sample by softmax over scores; temperature 0 = argmax (random tie-break). */
function sampleByScore(
  cells: readonly CellAnalysis[],
  temperature: number,
  rand: Rand,
): CellAnalysis {
  const best = Math.max(...cells.map((c) => c.score))
  if (temperature <= 0) {
    return uniformPick(cells.filter((c) => c.score === best), rand)
  }
  const weights = cells.map((c) => Math.exp((c.score - best) / temperature))
  let r = rand() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < cells.length; i++) {
    r -= weights[i]
    if (r <= 0) return cells[i]
  }
  return cells[cells.length - 1]
}

/**
 * Pick a move for the current player. Tier order: take a win, block an
 * enemy win, create a double threat, block an enemy double-threat setup,
 * otherwise sample quiet moves by score. Lower levels obey the tiers with
 * lower probability and sample at higher temperature.
 */
export function pickMove(state: GameState, level: Level, rand: Rand): number {
  if (state.status.kind !== 'playing') {
    throw new Error('pickMove called on a finished game')
  }
  const me = state.status.turn
  const config = LEVELS[level]

  const candidates: CellAnalysis[] = []
  for (let index = 0; index < state.board.length; index++) {
    if (state.board[index] === null) candidates.push(analyze(state, index, me))
  }

  const tiers: [readonly CellAnalysis[], number][] = [
    [candidates.filter((c) => c.wins > 0), config.win],
    [candidates.filter((c) => c.blocks > 0), config.block],
    [candidates.filter((c) => c.forks >= 2), config.fork],
    [candidates.filter((c) => c.enemyForks >= 2), config.blockFork],
  ]
  for (const [cells, chance] of tiers) {
    if (cells.length > 0 && rand() < chance) {
      return uniformPick(cells, rand).index
    }
  }
  return sampleByScore(candidates, config.temperature, rand).index
}

/**
 * Async facade — phase 2 (alpha-beta in a Web Worker) will keep this
 * signature, so the UI never needs to change.
 */
export function chooseMove(
  state: GameState,
  level: Level,
  rand: Rand = Math.random,
): Promise<number> {
  return Promise.resolve(pickMove(state, level, rand))
}
