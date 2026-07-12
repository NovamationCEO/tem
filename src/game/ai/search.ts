import { CELL_COUNT } from '../coords.ts'
import { LINES, LINES_BY_CELL } from '../lines.ts'
import type { GameState, Player } from '../state.ts'
import { mulberry32, type Rand } from './random.ts'

export interface SearchOptions {
  budgetMs: number
  maxDepth?: number
  /** Pick uniformly among root moves within this score margin of the best. */
  jitter?: number
}

const WIN_SCORE = 1_000_000
const MATE_BOUND = WIN_SCORE - 100
const MAX_PLY = 48
const LINE_COUNT = LINES.length

// Leaf weights per live-line mark count; dead lines contribute nothing.
const W = [0, 2, 12, 96]

// Zobrist keys: two independent 32-bit lanes, folded into a 53-bit-safe
// number for Map keys. Deterministic seed keeps tests reproducible.
const ZOBRIST_LO: Uint32Array[] = []
const ZOBRIST_HI: Uint32Array[] = []
{
  const rand = mulberry32(0xc0ffee)
  for (let player = 0; player < 2; player++) {
    const lo = new Uint32Array(CELL_COUNT)
    const hi = new Uint32Array(CELL_COUNT)
    for (let i = 0; i < CELL_COUNT; i++) {
      lo[i] = Math.floor(rand() * 0x100000000)
      hi[i] = Math.floor(rand() * 0x100000000)
    }
    ZOBRIST_LO.push(lo)
    ZOBRIST_HI.push(hi)
  }
}

/** Search position with O(lines-through-cell) make/unmake. */
class Position {
  readonly board = new Int8Array(CELL_COUNT) // 0 empty, 1, 2
  /** counts[p][line] = marks player p+1 has on that line. */
  readonly counts = [new Uint8Array(LINE_COUNT), new Uint8Array(LINE_COUNT)]
  turn: Player = 1
  filled = 0
  hashLo = 0
  hashHi = 0

  static from(state: GameState, turn: Player): Position {
    const pos = new Position()
    state.board.forEach((mark, index) => {
      if (mark !== null) pos.place(index, mark)
    })
    pos.turn = turn
    return pos
  }

  private place(index: number, player: Player): void {
    this.board[index] = player
    const counts = this.counts[player - 1]
    for (const line of LINES_BY_CELL[index]) counts[line]++
    this.filled++
    this.hashLo ^= ZOBRIST_LO[player - 1][index]
    this.hashHi ^= ZOBRIST_HI[player - 1][index]
  }

  make(index: number): void {
    this.place(index, this.turn)
    this.turn = this.turn === 1 ? 2 : 1
  }

  unmake(index: number): void {
    this.turn = this.turn === 1 ? 2 : 1
    const player = this.turn
    this.board[index] = 0
    const counts = this.counts[player - 1]
    for (const line of LINES_BY_CELL[index]) counts[line]--
    this.filled--
    this.hashLo ^= ZOBRIST_LO[player - 1][index]
    this.hashHi ^= ZOBRIST_HI[player - 1][index]
  }

  key(): number {
    return (this.hashLo >>> 0) * 2097152 + (this.hashHi >>> 11)
  }
}

const enum Flag {
  Exact,
  Lower,
  Upper,
}

interface Entry {
  depth: number
  score: number
  flag: Flag
  move: number
}

interface Ctx {
  nodes: number
  deadline: number
  tt: Map<number, Entry>
}

class SearchAbort extends Error {}

function emptyCellOf(pos: Position, line: number): number {
  for (const cell of LINES[line]) {
    if (pos.board[cell] === 0) return cell
  }
  throw new Error('line has no empty cell')
}

/** Cells that block the opponent's live 3-lines (deduplicated), or null. */
function enemyThreatCells(pos: Position): number[] | null {
  const me = pos.turn - 1
  const opp = 1 - me
  const cMe = pos.counts[me]
  const cOpp = pos.counts[opp]
  let cells: number[] | null = null
  for (let line = 0; line < LINE_COUNT; line++) {
    if (cOpp[line] === 3 && cMe[line] === 0) {
      const cell = emptyCellOf(pos, line)
      if (!cells) cells = [cell]
      else if (!cells.includes(cell)) cells.push(cell)
    }
  }
  return cells
}

/** True if the side to move can complete a line right now. */
function sideToMoveWins(pos: Position): boolean {
  const me = pos.turn - 1
  const opp = 1 - me
  const cMe = pos.counts[me]
  const cOpp = pos.counts[opp]
  for (let line = 0; line < LINE_COUNT; line++) {
    if (cMe[line] === 3 && cOpp[line] === 0) return true
  }
  return false
}

/** Static eval from the side to move's perspective. */
function evaluate(pos: Position): number {
  const c1 = pos.counts[0]
  const c2 = pos.counts[1]
  let score = 0
  for (let line = 0; line < LINE_COUNT; line++) {
    const a = c1[line]
    const b = c2[line]
    if (a > 0 && b > 0) continue
    score += W[a] - W[b]
  }
  return pos.turn === 1 ? score : -score
}

/**
 * Quiet-move ordering. Near the root a dynamic threat-aware score is worth
 * its cost; deeper, static centrality (lines through the cell) suffices.
 */
function orderedQuietMoves(pos: Position, depth: number, ttMove: number): number[] {
  const me = pos.turn - 1
  const opp = 1 - me
  const cMe = pos.counts[me]
  const cOpp = pos.counts[opp]
  const scored: { move: number; score: number }[] = []
  for (let index = 0; index < CELL_COUNT; index++) {
    if (pos.board[index] !== 0) continue
    const lines = LINES_BY_CELL[index]
    let score = lines.length
    if (depth >= 3) {
      for (const line of lines) {
        const a = cMe[line]
        const b = cOpp[line]
        if (a > 0 && b > 0) continue
        if (a === 2 && b === 0) score += 400
        else if (b === 2 && a === 0) score += 250
        else score += 2 * a + b
      }
    }
    if (index === ttMove) score += 100000
    scored.push({ move: index, score })
  }
  scored.sort((x, y) => y.score - x.score)
  return scored.map((s) => s.move)
}

function negamax(
  pos: Position,
  depth: number,
  ply: number,
  alpha: number,
  beta: number,
  ctx: Ctx,
): number {
  ctx.nodes++
  if ((ctx.nodes & 1023) === 0 && performance.now() > ctx.deadline) {
    throw new SearchAbort()
  }

  if (sideToMoveWins(pos)) return WIN_SCORE - ply
  if (pos.filled === CELL_COUNT) return 0
  if (ply >= MAX_PLY) return evaluate(pos)

  const threats = enemyThreatCells(pos)
  if (depth <= 0 && !threats) return evaluate(pos)

  const key = pos.key()
  const entry = ctx.tt.get(key)
  let ttMove = -1
  if (entry) {
    ttMove = entry.move
    if (entry.depth >= depth) {
      if (entry.flag === Flag.Exact) return entry.score
      if (entry.flag === Flag.Lower && entry.score >= beta) return entry.score
      if (entry.flag === Flag.Upper && entry.score <= alpha) return entry.score
    }
  }

  // Under threat the only non-losing replies are the blocking cells (winning
  // now was handled above) — Qubic's forcing chains collapse the tree here.
  const moves = threats ?? orderedQuietMoves(pos, depth, ttMove)
  // Forced replies extend the search rather than consuming depth.
  const nextDepth = moves.length === 1 ? depth : depth - 1

  const alphaOrig = alpha
  let best = -Infinity
  let bestMove = moves[0]
  for (const move of moves) {
    pos.make(move)
    const score = -negamax(pos, nextDepth, ply + 1, -beta, -alpha, ctx)
    pos.unmake(move)
    if (score > best) {
      best = score
      bestMove = move
    }
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }

  // Mate scores are ply-relative; storing them would corrupt other paths.
  if (Math.abs(best) < MATE_BOUND && (!entry || entry.depth <= depth)) {
    const flag =
      best <= alphaOrig ? Flag.Upper : best >= beta ? Flag.Lower : Flag.Exact
    ctx.tt.set(key, { depth, score: best, flag, move: bestMove })
  }
  return best
}

/**
 * Iterative-deepening alpha-beta under a time budget. Returns the best move
 * from the last fully completed depth; with `jitter`, samples uniformly among
 * root moves scoring within the margin (never away from a proven win).
 */
export function searchBestMove(
  state: GameState,
  options: SearchOptions,
  rand: Rand = Math.random,
): number {
  if (state.status.kind !== 'playing') {
    throw new Error('searchBestMove called on a finished game')
  }
  const pos = Position.from(state, state.status.turn)
  const ctx: Ctx = {
    nodes: 0,
    deadline: performance.now() + options.budgetMs,
    tt: new Map(),
  }

  // Root uses the same win/forced-block restriction as inner nodes.
  const me = pos.turn - 1
  const cMe = pos.counts[me]
  const cOpp = pos.counts[1 - me]
  for (let line = 0; line < LINE_COUNT; line++) {
    if (cMe[line] === 3 && cOpp[line] === 0) return emptyCellOf(pos, line)
  }
  let rootMoves = enemyThreatCells(pos) ?? orderedQuietMoves(pos, 3, -1)
  if (rootMoves.length === 1) return rootMoves[0]

  let bestMove = rootMoves[0]
  let bestScore = -Infinity
  let lastScores: { move: number; score: number }[] | null = null

  for (let depth = 1; depth <= (options.maxDepth ?? 16); depth++) {
    const scores: { move: number; score: number }[] = []
    let iterBest = rootMoves[0]
    let iterScore = -Infinity
    let alpha = -Infinity
    try {
      for (const move of rootMoves) {
        pos.make(move)
        const score = -negamax(pos, depth - 1, 1, -Infinity, -alpha, ctx)
        pos.unmake(move)
        scores.push({ move, score })
        if (score > iterScore) {
          iterScore = score
          iterBest = move
        }
        if (score > alpha) alpha = score
      }
    } catch (error) {
      if (error instanceof SearchAbort) break
      throw error
    }
    bestMove = iterBest
    bestScore = iterScore
    lastScores = scores
    rootMoves = [...scores].sort((x, y) => y.score - x.score).map((s) => s.move)
    if (bestScore >= MATE_BOUND) break // forced win found; play it
  }

  const jitter = options.jitter ?? 0
  if (jitter > 0 && lastScores && bestScore < MATE_BOUND) {
    const near = lastScores.filter((s) => s.score >= bestScore - jitter)
    return near[Math.floor(rand() * near.length)].move
  }
  return bestMove
}
