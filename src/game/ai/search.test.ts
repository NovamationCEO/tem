import { describe, expect, it } from 'vitest'
import { applyMove } from '../moves.ts'
import { newGame, type GameState } from '../state.ts'
import { pickMove } from './heuristic.ts'
import { mulberry32 } from './random.ts'
import { searchBestMove } from './search.ts'

const play = (moves: readonly number[]): GameState =>
  moves.reduce(applyMove, newGame())

/** Deterministic: effectively unlimited time, fixed depth. */
const fixedDepth = (depth: number) => ({ budgetMs: 1e9, maxDepth: depth })

describe('searchBestMove tactics', () => {
  it('takes an immediate win', () => {
    const state = play([0, 16, 1, 17, 2, 18])
    expect(searchBestMove(state, fixedDepth(2))).toBe(3)
  })

  it('blocks a lone enemy win', () => {
    const state = play([0, 16, 1, 17, 2])
    expect(searchBestMove(state, fixedDepth(2))).toBe(3)
  })

  it('prefers its own win over blocking', () => {
    // player 1 can win at 3; player 2 threatens at 16
    const state = play([0, 20, 1, 24, 2, 28])
    expect(searchBestMove(state, fixedDepth(2))).toBe(3)
  })

  it('finds the mate-in-3 fork', () => {
    // player 1 holds 1,2 (row through 0) and 4,8 (column through 0);
    // playing 0 creates two threats that cannot both be blocked.
    const state = play([1, 21, 2, 22, 4, 26, 8, 43])
    expect(searchBestMove(state, fixedDepth(5))).toBe(0)
  })

  it('defends the fork one ply earlier', () => {
    // player 2 to move with inert marks (no two share a line, so no
    // counter-checks). Player 1 forks at 0 next turn unless player 2
    // takes the fork cell (0) or kills one of its lines (3 or 12).
    const state = play([1, 21, 2, 43, 4, 57, 8])
    expect([0, 3, 12]).toContain(searchBestMove(state, fixedDepth(5)))
  })

  it('plays only legal moves through a full self-play game', () => {
    const rand = mulberry32(11)
    let state = newGame()
    let moves = 0
    while (state.status.kind === 'playing') {
      const move = searchBestMove(state, { budgetMs: 10, maxDepth: 4 }, rand)
      expect(state.board[move]).toBeNull()
      state = applyMove(state, move)
      moves++
      expect(moves).toBeLessThanOrEqual(64)
    }
    expect(['won', 'draw']).toContain(state.status.kind)
  })
})

describe('search strength', () => {
  it('beats the phase-1 heuristic in a short match', { timeout: 60_000 }, () => {
    let searchWins = 0
    for (let game = 0; game < 6; game++) {
      const searchPlays = game % 2 === 0 ? 1 : 2
      const rand = mulberry32(1000 + game)
      let state = newGame()
      while (state.status.kind === 'playing') {
        const move =
          state.status.turn === searchPlays
            ? searchBestMove(state, { budgetMs: 30, maxDepth: 8 }, rand)
            : pickMove(state, 4, rand)
        state = applyMove(state, move)
      }
      if (state.status.kind === 'won' && state.status.winner === searchPlays) {
        searchWins++
      }
    }
    expect(searchWins).toBeGreaterThanOrEqual(4)
  })
})
