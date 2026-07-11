import { describe, expect, it } from 'vitest'
import { coordToIndex } from './coords.ts'
import { applyMove } from './moves.ts'
import { linesThrough, threats, winningLine } from './queries.ts'
import { newGame, type GameState } from './state.ts'

const play = (moves: readonly number[]): GameState =>
  moves.reduce(applyMove, newGame())

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

describe('threats', () => {
  it('finds none in a new game', () => {
    expect(threats(newGame())).toEqual([])
  })

  it('finds a single threat when a player has three in a line', () => {
    // player 1 holds 0,1,2 of the x-axis line 0,1,2,3
    const found = threats(play([0, 16, 1, 17, 2]))
    expect(found).toHaveLength(1)
    expect(found[0].cell).toBe(3)
    expect(found[0].player).toBe(1)
    expect([...found[0].line].sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
  })

  it('does not report a blocked line', () => {
    // player 2 blocks cell 3 immediately
    expect(threats(play([0, 3, 1, 17, 2]))).toEqual([])
  })

  it('reports a double threat as one entry per line', () => {
    // player 1 holds 1,2,3 (x row) and 4,8,12 (y column); cell 0 completes both
    const found = threats(play([1, 21, 2, 22, 3, 26, 4, 38, 8, 57, 12, 60]))
    const p1Threats = found.filter((t) => t.player === 1)
    expect(p1Threats).toHaveLength(2)
    expect(p1Threats.every((t) => t.cell === 0)).toBe(true)
  })

  it('can report the same cell as a threat for both players', () => {
    // player 1 holds 1,2,3; player 2 holds 4,8,12 — both need cell 0
    const found = threats(play([1, 4, 2, 8, 3, 12]))
    expect(found).toHaveLength(2)
    expect(found.map((t) => ({ cell: t.cell, player: t.player }))).toEqual(
      expect.arrayContaining([
        { cell: 0, player: 1 },
        { cell: 0, player: 2 },
      ]),
    )
  })

  it('finds no threats in a finished game', () => {
    // player 1 wins with 0,1,2,3 while also holding three of a column
    const won = play([0, 16, 1, 17, 2, 18, 3])
    expect(won.status.kind).toBe('won')
    expect(threats(won)).toEqual([])
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
