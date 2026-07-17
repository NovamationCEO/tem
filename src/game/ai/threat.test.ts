import { describe, expect, it } from 'vitest'
import { applyMove } from '../moves.ts'
import { newGame, type GameState, type Player } from '../state.ts'
import { mulberry32 } from './random.ts'
import { searchBestMove } from './search.ts'
import { findForcedWin, hasForcedWin } from './threat.ts'

const play = (moves: readonly number[]): GameState =>
  moves.reduce(applyMove, newGame())

function legalMoves(state: GameState): number[] {
  const cells: number[] = []
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === null) cells.push(i)
  }
  return cells
}

/**
 * Exhaustive soundness check: with `attacker` to move, the attacker follows the
 * oracle's head move, and we try EVERY legal opponent reply — the attacker must
 * win down every branch. If the oracle ever claims a win the opponent can
 * escape, this returns false. This is a full proof for the (shallow) positions
 * it's run on, not a sampled heuristic.
 */
function attackerForcesWin(state: GameState, attacker: Player): boolean {
  if (state.status.kind !== 'playing') return false
  const seq = findForcedWin(state)
  if (!seq) return false

  const afterAttack = applyMove(state, seq[0])
  if (afterAttack.status.kind === 'won') {
    return afterAttack.status.winner === attacker
  }
  if (afterAttack.status.kind === 'draw') return false

  // Opponent to move: the attack must survive every possible reply.
  for (const reply of legalMoves(afterAttack)) {
    const afterReply = applyMove(afterAttack, reply)
    if (afterReply.status.kind === 'won') {
      if (afterReply.status.winner !== attacker) return false // opponent escaped
      continue
    }
    if (afterReply.status.kind === 'draw') return false
    if (!attackerForcesWin(afterReply, attacker)) return false
  }
  return true
}

describe('findForcedWin — recognition', () => {
  it('takes an immediate winning completion', () => {
    // player 1 holds a full row bar one cell.
    const state = play([0, 16, 1, 17, 2, 18])
    expect(findForcedWin(state)).toEqual([3])
  })

  it('finds a one-move double threat (fork)', () => {
    // player 1 holds 1,2 and 4,8; playing 0 threatens both 3 and 12.
    const state = play([1, 21, 2, 22, 4, 26, 8, 43])
    const seq = findForcedWin(state)
    expect(seq).not.toBeNull()
    expect(seq![0]).toBe(0)
  })

  it('finds nothing on an empty board (no forcing chain from move one)', () => {
    expect(findForcedWin(newGame())).toBeNull()
  })

  it('does not claim a win from a lone unsupported threat', () => {
    // player 1 threatens one line (0,1,2 → 3) with no follow-up; player 2
    // simply blocks and the attack fizzles.
    const state = play([0, 21, 1, 22, 2, 43])
    // 3 is an immediate completion here, so that IS a win — use a 2-in-a-row
    // instead, which only threatens, and verify no forced win exists.
    const soft = play([0, 21, 1, 43])
    expect(findForcedWin(state)).toEqual([3]) // completion available
    expect(findForcedWin(soft)).toBeNull() // only a 2-line, nothing forced
  })

  it('is refuted when the opponent has their own immediate win', () => {
    // player 1 to move can make a threat, but player 2 already completes a
    // line first, so no attack is forced.
    const state = play([0, 16, 1, 17, 5, 18])
    // player 2 threatens 19 (16,17,18 → 19). player 1 has no completion and no
    // check that also removes that threat, so the oracle must decline.
    expect(hasForcedWin(state)).toBe(false)
  })
})

describe('findForcedWin — exhaustive soundness', () => {
  it('the one-move fork wins against every defense', () => {
    const state = play([1, 21, 2, 22, 4, 26, 8, 43])
    expect(attackerForcesWin(state, 1)).toBe(true)
  })

  it('every claimed win in random play is a real forced win', () => {
    // Sweep random positions; whenever the oracle reports a (short) forced win,
    // prove it exhaustively against all defenses.
    let verified = 0
    for (let seed = 0; seed < 60; seed++) {
      const rand = mulberry32(seed)
      let state = newGame()
      while (state.status.kind === 'playing') {
        if (state.status.kind === 'playing') {
          const attacker = state.status.turn
          const seq = findForcedWin(state)
          // Only exhaustively verify shallow wins to keep the proof cheap.
          if (seq && seq.length <= 2) {
            expect(attackerForcesWin(state, attacker)).toBe(true)
            verified++
            break // this game has served its purpose
          }
        }
        const moves = legalMoves(state)
        state = applyMove(state, moves[Math.floor(rand() * moves.length)])
      }
    }
    expect(verified).toBeGreaterThan(0) // the sweep actually found forced wins
  })
})

describe('findForcedWin — agreement with alpha-beta', () => {
  it('never reports a win alpha-beta evaluates as lost or drawn', () => {
    // If the oracle says "forced win," playing its head and then defending with
    // deep alpha-beta must still let the attacker win.
    let checked = 0
    for (let seed = 100; seed < 160 && checked < 8; seed++) {
      const rand = mulberry32(seed)
      let state = newGame()
      while (state.status.kind === 'playing') {
        const attacker = state.status.turn
        const seq = findForcedWin(state)
        if (seq) {
          // Attacker follows the oracle; opponent defends with alpha-beta.
          let g = state
          let mover = attacker
          while (g.status.kind === 'playing') {
            const move =
              mover === attacker
                ? findForcedWin(g)![0]
                : searchBestMove(g, { maxDepth: 4 }, rand)
            g = applyMove(g, move)
            mover = mover === 1 ? 2 : 1
          }
          expect(g.status.kind === 'won' && g.status.winner === attacker).toBe(
            true,
          )
          checked++
          break
        }
        const moves = legalMoves(state)
        state = applyMove(state, moves[Math.floor(rand() * moves.length)])
      }
    }
    expect(checked).toBeGreaterThan(0)
  })
})
