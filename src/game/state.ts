export type Player = 1 | 2

export type GameStatus =
  | { kind: 'playing'; turn: Player }
  | { kind: 'won'; winner: Player }
  | { kind: 'draw' }

export interface GameState {
  status: GameStatus
  moves: number
}

export function newGame(): GameState {
  return { status: { kind: 'playing', turn: 1 }, moves: 0 }
}

export function otherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1
}

/**
 * Advance to the next turn. Win/draw detection will hook in here once the
 * game's rules exist — for now every move just passes play to the opponent.
 */
export function endTurn(state: GameState): GameState {
  if (state.status.kind !== 'playing') return state
  return {
    status: { kind: 'playing', turn: otherPlayer(state.status.turn) },
    moves: state.moves + 1,
  }
}
