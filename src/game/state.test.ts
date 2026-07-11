import { describe, expect, it } from 'vitest'
import { CELL_COUNT } from './coords.ts'
import { newGame, otherPlayer } from './state.ts'

describe('game state', () => {
  it('starts with an empty 64-cell board and player 1 to move', () => {
    const game = newGame()
    expect(game.board).toHaveLength(CELL_COUNT)
    expect(game.board.every((cell) => cell === null)).toBe(true)
    expect(game.status).toEqual({ kind: 'playing', turn: 1 })
    expect(game.moves).toBe(0)
  })

  it('otherPlayer flips between 1 and 2', () => {
    expect(otherPlayer(1)).toBe(2)
    expect(otherPlayer(2)).toBe(1)
  })
})
