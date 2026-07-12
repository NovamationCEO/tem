import { describe, expect, it } from 'vitest'
import { applyMove } from '../moves.ts'
import { newGame, type GameState } from '../state.ts'
import { chooseMove, pickMove } from './heuristic.ts'
import { mulberry32 } from './random.ts'

const play = (moves: readonly number[]): GameState =>
  moves.reduce(applyMove, newGame())

describe('pickMove level 4 (no randomness in tiers)', () => {
  it('always takes an immediate win', () => {
    // player 1 holds 0,1,2 of line 0-3; player 2 elsewhere
    const state = play([0, 16, 1, 17, 2, 18])
    for (let seed = 0; seed < 25; seed++) {
      expect(pickMove(state, 4, mulberry32(seed))).toBe(3)
    }
  })

  it('always blocks a lone enemy win', () => {
    // player 1 threatens at 3; player 2 to move with no win of its own
    const state = play([0, 16, 1, 17, 2])
    for (let seed = 0; seed < 25; seed++) {
      expect(pickMove(state, 4, mulberry32(seed))).toBe(3)
    }
  })

  it('prefers its own win over blocking', () => {
    // player 1 can win at 3; player 2 threatens at 16
    const state = play([0, 20, 1, 24, 2, 28])
    for (let seed = 0; seed < 25; seed++) {
      expect(pickMove(state, 4, mulberry32(seed))).toBe(3)
    }
  })

  it('creates a double threat when available', () => {
    // player 1 holds 1,2 (row through 0) and 4,8 (column through 0);
    // playing 0 creates two simultaneous threats. Player 2 marks are inert.
    const state = play([1, 21, 2, 22, 4, 26, 8, 43])
    for (let seed = 0; seed < 25; seed++) {
      expect(pickMove(state, 4, mulberry32(seed))).toBe(0)
    }
  })

  it('blocks an enemy double-threat setup', () => {
    // player 2 to move; player 1 holds 1,2 and 4,8 — cell 0 would give
    // player 1 a double threat next turn, and nothing else is urgent.
    const state = play([1, 21, 2, 22, 4, 26, 8])
    for (let seed = 0; seed < 25; seed++) {
      expect(pickMove(state, 4, mulberry32(seed))).toBe(0)
    }
  })

  it('never returns an occupied cell across random playouts', () => {
    const rand = mulberry32(7)
    let state = newGame()
    while (state.status.kind === 'playing') {
      const move = pickMove(state, 4, rand)
      expect(state.board[move]).toBeNull()
      state = applyMove(state, move)
    }
  })
})

describe('difficulty behavior', () => {
  it('level 1 sometimes takes and sometimes misses a win', () => {
    const state = play([0, 16, 1, 17, 2, 18])
    let taken = 0
    for (let seed = 0; seed < 200; seed++) {
      if (pickMove(state, 1, mulberry32(seed)) === 3) taken++
    }
    // win chance is 0.6 (plus rare accidental picks); expect a real mix
    expect(taken).toBeGreaterThan(60)
    expect(taken).toBeLessThan(190)
  })

  it('same seed reproduces an identical self-play game', () => {
    const playout = (seed: number): number[] => {
      const rand = mulberry32(seed)
      const moves: number[] = []
      let state = newGame()
      while (state.status.kind === 'playing') {
        const move = pickMove(state, 3, rand)
        moves.push(move)
        state = applyMove(state, move)
      }
      return moves
    }
    expect(playout(123)).toEqual(playout(123))
  })

  it('AI-vs-AI games terminate legally at every level', () => {
    for (const level of [1, 2, 3, 4] as const) {
      const rand = mulberry32(level * 100)
      let state = newGame()
      let moves = 0
      while (state.status.kind === 'playing') {
        state = applyMove(state, pickMove(state, level, rand))
        moves++
        expect(moves).toBeLessThanOrEqual(64)
      }
      expect(['won', 'draw']).toContain(state.status.kind)
    }
  })
})

describe('chooseMove', () => {
  it('resolves to a legal move', async () => {
    const state = play([0, 16, 1, 17, 2])
    await expect(chooseMove(state, 4, mulberry32(1))).resolves.toBe(3)
  })
})
