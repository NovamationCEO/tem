import { CELL_COUNT } from '../coords.ts'
import { LINES, LINES_BY_CELL } from '../lines.ts'
import type { GameState, Player } from '../state.ts'
import { emptyCellOf, Position } from './search.ts'

/**
 * Threat-space search (Allis' technique, sprint-3 tier). Searches *only*
 * forcing moves — "checks" that create an immediate winning threat — and
 * treats the opponent's replies as forced. Because the branching collapses,
 * deep forced wins are found in milliseconds.
 *
 * Soundness vs. completeness: this finds every win reachable by a chain of
 * single checks culminating in a double threat, and every sequence it returns
 * is a *genuine* forced win (verified exhaustively in the tests). It does NOT
 * find wins that need a quiet preparation move — those aren't forcing, so the
 * opponent wouldn't be compelled to cooperate. That's the right trade for an
 * oracle: when it says "forced win," trust it and execute; when it says no,
 * fall back to the normal alpha-beta search.
 *
 * The key correctness subtlety (docs/ai-options.md flags it) is defensive
 * counter-threats: the opponent's forced block, or a pre-existing threat of
 * theirs, can pre-empt our attack. We handle it by checking for an opponent
 * immediate win after every one of our moves — if they have one, our line is
 * refuted, because they simply take it instead of defending.
 */

const LINE_COUNT = LINES.length

export interface ThreatSearchOptions {
  /** Max length of the forcing sequence, counted in the attacker's moves. */
  maxDepth?: number
  /** Cap on forcing moves explored, bounding worst-case cost. */
  maxNodes?: number
}

interface Ctx {
  nodes: number
  maxNodes: number
  maxDepth: number
}

/** First empty cell that completes a line for `player`, or -1 if none. */
function firstWinningSquare(pos: Position, player: Player): number {
  const mine = pos.counts[player - 1]
  const theirs = pos.counts[2 - player]
  for (let line = 0; line < LINE_COUNT; line++) {
    if (mine[line] === 3 && theirs[line] === 0) return emptyCellOf(pos, line)
  }
  return -1
}

/** All distinct empty cells that complete a line for `player` (their threats). */
function winningSquares(pos: Position, player: Player): number[] {
  const mine = pos.counts[player - 1]
  const theirs = pos.counts[2 - player]
  const cells: number[] = []
  for (let line = 0; line < LINE_COUNT; line++) {
    if (mine[line] === 3 && theirs[line] === 0) {
      const cell = emptyCellOf(pos, line)
      if (!cells.includes(cell)) cells.push(cell)
    }
  }
  return cells
}

/**
 * Empty cells where `player` moving would create at least one new threat
 * (a live line going from 2 to 3 marks), ordered so moves creating the most
 * threats — double-threat winners — are tried first.
 */
function threateningMoves(pos: Position, player: Player): number[] {
  const mine = pos.counts[player - 1]
  const theirs = pos.counts[2 - player]
  const scored: { move: number; threats: number }[] = []
  for (let cell = 0; cell < CELL_COUNT; cell++) {
    if (pos.board[cell] !== 0) continue
    let threats = 0
    for (const line of LINES_BY_CELL[cell]) {
      if (mine[line] === 2 && theirs[line] === 0) threats++
    }
    if (threats > 0) scored.push({ move: cell, threats })
  }
  scored.sort((a, b) => b.threats - a.threats)
  return scored.map((s) => s.move)
}

/** Attacker (= pos.turn) to move. Returns their forcing moves to a win, or null. */
function search(pos: Position, ctx: Ctx, depth: number): number[] | null {
  const attacker = pos.turn

  // Already threatening a completion: just take it.
  const immediate = firstWinningSquare(pos, attacker)
  if (immediate >= 0) return [immediate]

  if (depth >= ctx.maxDepth) return null

  for (const move of threateningMoves(pos, attacker)) {
    if (++ctx.nodes > ctx.maxNodes) return null
    pos.make(move) // attacker plays a check; opponent to move
    const rest = afterCheck(pos, ctx, depth)
    pos.unmake(move)
    if (rest) return [move, ...rest]
  }
  return null
}

/** Opponent to move, having just been checked by the attacker. */
function afterCheck(pos: Position, ctx: Ctx, depth: number): number[] | null {
  const opponent = pos.turn
  const attacker: Player = opponent === 1 ? 2 : 1

  // If the opponent can win outright, they ignore our threat — line refuted.
  // (This also means their forced block can't complete a four for them, so no
  // separate check is needed after they block.)
  if (firstWinningSquare(pos, opponent) >= 0) return null

  const threats = winningSquares(pos, attacker)
  if (threats.length >= 2) return [] // double threat: opponent can't block both
  if (threats.length === 0) return null // defensive guard; shouldn't happen

  // Single threat: the opponent's only non-losing move is to block it.
  const block = threats[0]
  pos.make(block) // opponent blocks; attacker to move again
  const rest = search(pos, ctx, depth + 1)
  pos.unmake(block)
  return rest
}

/**
 * If the side to move has a forced win by a chain of checks, return the
 * attacker's forcing moves (the head is the move to play now); otherwise null.
 */
export function findForcedWin(
  state: GameState,
  options: ThreatSearchOptions = {},
): number[] | null {
  if (state.status.kind !== 'playing') return null
  const pos = Position.from(state, state.status.turn)
  const ctx: Ctx = {
    nodes: 0,
    maxNodes: options.maxNodes ?? 200_000,
    maxDepth: options.maxDepth ?? 30,
  }
  return search(pos, ctx, 0)
}

/** Whether the side to move has a forced win reachable by threat-space search. */
export function hasForcedWin(
  state: GameState,
  options?: ThreatSearchOptions,
): boolean {
  return findForcedWin(state, options) !== null
}
