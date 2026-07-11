import { applyMove } from './moves.ts'
import { newGame, type GameState } from './state.ts'

/**
 * A game with undo support: the full sequence of states from the initial
 * position to the current one. States are immutable, so this is cheap.
 */
export type History = readonly GameState[]

export function newHistory(): History {
  return [newGame()]
}

export function currentState(history: History): GameState {
  return history[history.length - 1]
}

/** Apply a move to the current state; illegal moves leave history unchanged. */
export function pushMove(history: History, index: number): History {
  const current = currentState(history)
  const next = applyMove(current, index)
  return next === current ? history : [...history, next]
}

/** Step back one half-move (also revives a finished game). */
export function undo(history: History): History {
  return history.length > 1 ? history.slice(0, -1) : history
}

export function canUndo(history: History): boolean {
  return history.length > 1
}
