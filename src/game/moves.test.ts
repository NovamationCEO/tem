import { describe, expect, it } from 'vitest'
import { LINES } from './lines.ts'
import { applyMove } from './moves.ts'
import { newGame, type GameState } from './state.ts'

const play = (moves: readonly number[], from: GameState = newGame()) =>
  moves.reduce(applyMove, from)

const sorted = (line: readonly number[]) => [...line].sort((a, b) => a - b)

// Full 64-move games found by randomized search and verified by simulation;
// hand-building a legal full-board game without an accidental early win is
// error-prone.
const DRAW_SEQUENCE = [
  2, 0, 4, 1, 5, 3, 6, 7, 8, 9, 11, 10, 12, 13, 14, 16, 15, 22, 17, 23, 18,
  24, 19, 26, 20, 27, 21, 29, 25, 30, 28, 33, 31, 35, 32, 36, 34, 37, 39, 38,
  41, 40, 42, 44, 43, 45, 46, 47, 48, 49, 52, 50, 55, 51, 56, 53, 57, 54, 58,
  59, 61, 60, 63, 62,
]
const WIN_ON_64_SEQUENCE = [
  2, 0, 3, 1, 4, 7, 5, 9, 6, 10, 8, 13, 11, 16, 12, 17, 14, 22, 15, 23, 18,
  24, 19, 26, 20, 27, 21, 29, 25, 30, 28, 33, 31, 35, 32, 36, 34, 37, 39, 38,
  41, 40, 42, 44, 43, 45, 46, 47, 48, 50, 52, 51, 55, 53, 56, 54, 57, 59, 58,
  60, 61, 62, 63, 49,
]
const WIN_ON_64_LINE = [1, 17, 33, 49]

describe('applyMove', () => {
  it('places the current player mark, increments moves, flips the turn', () => {
    const state = applyMove(newGame(), 5)
    expect(state.board[5]).toBe(1)
    expect(state.moves).toBe(1)
    expect(state.status).toEqual({ kind: 'playing', turn: 2 })
  })

  it('does not mutate the previous state', () => {
    const before = newGame()
    applyMove(before, 5)
    expect(before.board[5]).toBeNull()
    expect(before.moves).toBe(0)
  })

  it('alternates players across a sequence of moves', () => {
    const state = play([0, 1, 2, 3])
    expect(state.board[0]).toBe(1)
    expect(state.board[1]).toBe(2)
    expect(state.board[2]).toBe(1)
    expect(state.board[3]).toBe(2)
    expect(state.status).toEqual({ kind: 'playing', turn: 1 })
  })

  it('ignores a move on an occupied cell', () => {
    const state = play([0])
    expect(applyMove(state, 0)).toBe(state)
  })

  it('ignores out-of-range and non-integer indices', () => {
    const state = newGame()
    expect(applyMove(state, -1)).toBe(state)
    expect(applyMove(state, 64)).toBe(state)
    expect(applyMove(state, 1.5)).toBe(state)
  })

  it('ignores moves after the game is over', () => {
    // player 1 completes the x-axis line 0,1,2,3 (y=0, z=0)
    const won = play([0, 16, 1, 17, 2, 18, 3])
    expect(won.status.kind).toBe('won')
    expect(applyMove(won, 20)).toBe(won)
  })
})

describe('win detection', () => {
  it('detects a win for every one of the 76 lines', () => {
    for (const line of LINES) {
      const filler: number[] = []
      for (let cell = 0; filler.length < 3; cell++) {
        if (!line.includes(cell)) filler.push(cell)
      }
      const state = play([
        line[0], filler[0], line[1], filler[1], line[2], filler[2], line[3],
      ])
      expect(state.status.kind).toBe('won')
      if (state.status.kind === 'won') {
        expect(state.status.winner).toBe(1)
        expect(sorted(state.status.line)).toEqual(sorted(line))
      }
    }
  })

  it('reports the completed line for the winning player 2', () => {
    // player 2 completes the y-axis line 0,4,8,12 (x=0, z=0)
    const state = play([1, 0, 2, 4, 3, 8, 5, 12])
    expect(state.status).toMatchObject({ kind: 'won', winner: 2 })
    if (state.status.kind === 'won') {
      expect(sorted(state.status.line)).toEqual([0, 4, 8, 12])
    }
  })
})

describe('draw detection', () => {
  it('declares a draw when all 64 cells fill without a win', () => {
    const state = play(DRAW_SEQUENCE)
    expect(state.moves).toBe(64)
    expect(state.status).toEqual({ kind: 'draw' })
  })

  it('is still playing before the final move of a drawn game', () => {
    const state = play(DRAW_SEQUENCE.slice(0, 63))
    expect(state.status).toEqual({ kind: 'playing', turn: 2 })
  })

  it('reports a win, not a draw, when the 64th move completes a line', () => {
    const state = play(WIN_ON_64_SEQUENCE)
    expect(state.moves).toBe(64)
    expect(state.status).toMatchObject({ kind: 'won', winner: 2 })
    if (state.status.kind === 'won') {
      expect(sorted(state.status.line)).toEqual(WIN_ON_64_LINE)
    }
  })
})
