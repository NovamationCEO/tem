import { CELL_COUNT } from './coords.ts'

export type Player = 1 | 2

export type Cell = Player | null

export type GameStatus =
  | { kind: 'playing'; turn: Player }
  | { kind: 'won'; winner: Player; line: readonly number[] }
  | { kind: 'draw' }

export interface GameState {
  board: readonly Cell[]
  status: GameStatus
  moves: number
}

export function newGame(): GameState {
  return {
    board: Array.from({ length: CELL_COUNT }, () => null),
    status: { kind: 'playing', turn: 1 },
    moves: 0,
  }
}

export function otherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1
}
