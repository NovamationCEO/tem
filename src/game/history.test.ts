import { describe, expect, it } from 'vitest'
import { canUndo, currentState, newHistory, pushMove, undo } from './history.ts'

describe('history', () => {
  it('starts at a fresh game with nothing to undo', () => {
    const history = newHistory()
    expect(currentState(history).moves).toBe(0)
    expect(canUndo(history)).toBe(false)
  })

  it('pushMove advances the game and enables undo', () => {
    const history = pushMove(newHistory(), 5)
    expect(currentState(history).board[5]).toBe(1)
    expect(currentState(history).moves).toBe(1)
    expect(canUndo(history)).toBe(true)
  })

  it('ignores illegal moves without growing the history', () => {
    const history = pushMove(newHistory(), 5)
    expect(pushMove(history, 5)).toBe(history)
    expect(pushMove(history, -1)).toBe(history)
  })

  it('undo returns to the exact previous state', () => {
    const one = pushMove(newHistory(), 5)
    const two = pushMove(one, 6)
    expect(undo(two)).toEqual(one)
    expect(currentState(undo(two)).board[6]).toBeNull()
  })

  it('undo on a fresh game is a no-op', () => {
    const history = newHistory()
    expect(undo(history)).toBe(history)
  })

  it('undo revives a finished game', () => {
    // player 1 completes the x-axis line 0,1,2,3 (y=0, z=0)
    const won = [0, 16, 1, 17, 2, 18, 3].reduce(pushMove, newHistory())
    expect(currentState(won).status.kind).toBe('won')
    const revived = undo(won)
    expect(currentState(revived).status).toEqual({ kind: 'playing', turn: 1 })
    expect(currentState(revived).board[3]).toBeNull()
  })
})
