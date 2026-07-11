import { LINES, LINES_BY_CELL } from './lines.ts'
import type { GameState } from './state.ts'

/** The four cell indices of the winning line, or null if nobody has won. */
export function winningLine(state: GameState): readonly number[] | null {
  return state.status.kind === 'won' ? state.status.line : null
}

/** All winning lines that pass through the given cell. */
export function linesThrough(index: number): readonly (readonly number[])[] {
  return (LINES_BY_CELL[index] ?? []).map((lineId) => LINES[lineId])
}
