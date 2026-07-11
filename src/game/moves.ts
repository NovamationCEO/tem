import { CELL_COUNT } from './coords.ts'
import { LINES, LINES_BY_CELL } from './lines.ts'
import {
  otherPlayer,
  type GameState,
  type GameStatus,
  type Player,
  type Cell,
} from './state.ts'

/**
 * Apply the current player's move at `index` and return the new state.
 *
 * Illegal moves — occupied cell, finished game, out-of-range index — return
 * the original state unchanged (silent no-op; misclicks are self-evident in
 * hot-seat play). Revisit for online play, where rejections must be signaled.
 */
export function applyMove(state: GameState, index: number): GameState {
  if (state.status.kind !== 'playing') return state
  if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) return state
  if (state.board[index] !== null) return state

  const player = state.status.turn
  const board: Cell[] = state.board.slice()
  board[index] = player
  const moves = state.moves + 1
  return { board, status: nextStatus(board, index, player, moves), moves }
}

function nextStatus(
  board: readonly Cell[],
  index: number,
  player: Player,
  moves: number,
): GameStatus {
  // Only lines through the just-played cell can have become a win.
  for (const lineId of LINES_BY_CELL[index]) {
    const line = LINES[lineId]
    if (line.every((cell) => board[cell] === player)) {
      return { kind: 'won', winner: player, line }
    }
  }
  if (moves === CELL_COUNT) return { kind: 'draw' }
  return { kind: 'playing', turn: otherPlayer(player) }
}
