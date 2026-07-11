import { describe, expect, it } from 'vitest'
import { coordToIndex } from './coords.ts'
import { applyMove } from './moves.ts'
import { linesThrough, winningLine } from './queries.ts'
import { newGame } from './state.ts'

describe('winningLine', () => {
  it('returns null while playing and after a draw-free start', () => {
    expect(winningLine(newGame())).toBeNull()
    expect(winningLine(applyMove(newGame(), 0))).toBeNull()
  })

  it('returns the four winning cells after a win', () => {
    // player 1 completes the x-axis line 0,1,2,3 (y=0, z=0)
    const state = [0, 16, 1, 17, 2, 18, 3].reduce(applyMove, newGame())
    const line = winningLine(state)
    expect(line).not.toBeNull()
    expect([...line!].sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
  })
})

describe('linesThrough', () => {
  it('returns the 7 lines through a corner cell', () => {
    const lines = linesThrough(coordToIndex({ x: 0, y: 0, z: 0 }))
    expect(lines).toHaveLength(7)
    for (const line of lines) {
      expect(line).toContain(0)
    }
  })

  it('returns an empty list for out-of-range indices', () => {
    expect(linesThrough(-1)).toEqual([])
    expect(linesThrough(64)).toEqual([])
  })
})
