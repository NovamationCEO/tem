import { describe, expect, it } from 'vitest'
import { endTurn, newGame, otherPlayer } from './state.ts'

describe('game state', () => {
  it('starts with player 1 to move', () => {
    const game = newGame()
    expect(game.status).toEqual({ kind: 'playing', turn: 1 })
    expect(game.moves).toBe(0)
  })

  it('alternates turns between the two players', () => {
    const afterOne = endTurn(newGame())
    expect(afterOne.status).toEqual({ kind: 'playing', turn: 2 })
    const afterTwo = endTurn(afterOne)
    expect(afterTwo.status).toEqual({ kind: 'playing', turn: 1 })
    expect(afterTwo.moves).toBe(2)
  })

  it('does not advance a finished game', () => {
    const finished = { status: { kind: 'won', winner: 1 }, moves: 5 } as const
    expect(endTurn(finished)).toBe(finished)
  })

  it('otherPlayer flips between 1 and 2', () => {
    expect(otherPlayer(1)).toBe(2)
    expect(otherPlayer(2)).toBe(1)
  })
})
