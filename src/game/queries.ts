import { LINES, LINES_BY_CELL } from './lines.ts'
import type { GameState, Player } from './state.ts'

/** The four cell indices of the winning line, or null if nobody has won. */
export function winningLine(state: GameState): readonly number[] | null {
  return state.status.kind === 'won' ? state.status.line : null
}

/** All winning lines that pass through the given cell. */
export function linesThrough(index: number): readonly (readonly number[])[] {
  return (LINES_BY_CELL[index] ?? []).map((lineId) => LINES[lineId])
}

export interface Threat {
  /** The empty cell that would complete the line. */
  cell: number
  /** Who wins by playing it. */
  player: Player
  line: readonly number[]
}

/**
 * Every empty cell that would complete four-in-a-row, with the player who
 * would win by playing it. The same cell can appear once per line it
 * completes, and can be a threat for both players. Finished games have no
 * threats by definition.
 */
export function threats(state: GameState): Threat[] {
  if (state.status.kind !== 'playing') return []
  const found: Threat[] = []
  for (const line of LINES) {
    let emptyCell = -1
    let empties = 0
    let p1 = 0
    for (const cell of line) {
      const mark = state.board[cell]
      if (mark === null) {
        empties++
        emptyCell = cell
      } else if (mark === 1) {
        p1++
      }
    }
    if (empties !== 1) continue
    if (p1 === 3) found.push({ cell: emptyCell, player: 1, line })
    else if (p1 === 0) found.push({ cell: emptyCell, player: 2, line })
  }
  return found
}
