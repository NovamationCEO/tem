import type { Cell, GameState, Player } from '../state.ts'
import { pickMoveForLevel, type Level } from './index.ts'
import { mulberry32 } from './random.ts'

export interface MoveRequest {
  id: number
  board: Cell[]
  turn: Player
  moves: number
  level: Level
  seed: number
}

export interface MoveResponse {
  id: number
  move: number
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<MoveRequest>) => void) | null
  postMessage: (message: MoveResponse) => void
}

scope.onmessage = (event) => {
  const { id, board, turn, moves, level, seed } = event.data
  const state: GameState = {
    board,
    status: { kind: 'playing', turn },
    moves,
  }
  const move = pickMoveForLevel(state, level, mulberry32(seed))
  scope.postMessage({ id, move })
}
