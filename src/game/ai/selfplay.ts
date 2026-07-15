import { applyMove } from '../moves.ts'
import { newGame, type GameState } from '../state.ts'
import { pickMove, type HeuristicLevel } from './heuristic.ts'
import { mulberry32, type Rand } from './random.ts'
import { searchBestMove } from './search.ts'

/**
 * Self-play calibration harness. Pure and headless — no worker, no DOM — so
 * thousands of games run under Node/Vitest in seconds. Used to measure the
 * relative strength (Elo) of AI configurations and to guard against
 * regressions when the engine changes. See `docs/ai-options.md` §"Difficulty
 * design" point 4.
 */

/** A player the harness can pit against another: name plus a move policy. */
export interface Agent {
  readonly name: string
  pick(state: GameState, rand: Rand): number
}

/** The phase-1 heuristic at a fixed tuning tier. */
export function heuristicAgent(level: HeuristicLevel): Agent {
  return {
    name: `heuristic-L${level}`,
    pick: (state, rand) => pickMove(state, level, rand),
  }
}

/**
 * Fixed-depth alpha-beta — the same engine and depth the game ships (see
 * `LADDER` in index.ts), so calibration measures exactly what players face.
 * With `jitter` 0 the search consumes no RNG, so a matchup between two such
 * agents would replay the *same* game every time — the random opening plies in
 * `playGame` diversify it.
 */
export function searchAgent(depth: number, jitter = 0): Agent {
  const suffix = jitter ? `-j${jitter}` : ''
  return {
    name: `search-d${depth}${suffix}`,
    pick: (state, rand) =>
      searchBestMove(state, { maxDepth: depth, jitter }, rand),
  }
}

export type GameResult = 'a' | 'b' | 'draw'

function legalMoves(state: GameState): number[] {
  const moves: number[] = []
  for (let i = 0; i < state.board.length; i++) {
    if (state.board[i] === null) moves.push(i)
  }
  return moves
}

/**
 * Play one game to completion. `a` moves first (player 1), `b` second.
 *
 * The first `openingPlies` moves are chosen uniformly at random (from the same
 * seeded stream), then the agents take over. Random openings give distinct
 * games per seed even when both agents are deterministic, and reduce the
 * correlation between games — the standard way to sample an engine's strength.
 */
export function playGame(
  a: Agent,
  b: Agent,
  seed: number,
  openingPlies = 0,
): GameResult {
  const rand = mulberry32(seed)
  let state = newGame()
  let ply = 0
  while (state.status.kind === 'playing') {
    let move: number
    let who: string
    if (ply < openingPlies) {
      const options = legalMoves(state)
      move = options[Math.floor(rand() * options.length)]
      who = 'opening'
    } else {
      const agent = state.status.turn === 1 ? a : b
      move = agent.pick(state, rand)
      who = agent.name
    }
    const next = applyMove(state, move)
    if (next === state) throw new Error(`${who} returned illegal move ${move}`)
    state = next
    ply++
  }
  if (state.status.kind === 'draw') return 'draw'
  return state.status.winner === 1 ? 'a' : 'b'
}

export interface Standing {
  name: string
  wins: number
  draws: number
  losses: number
  games: number
  /** wins + 0.5·draws. */
  score: number
  /** Estimated Elo (anchored so the field averages `anchor`, default 1500). */
  elo: number
  /** Score accumulated while moving first, and games played first. */
  firstScore: number
  firstGames: number
}

export interface RoundRobinResult {
  standings: Standing[]
  /** Fraction of decisive games won by the first mover (draws excluded). */
  firstMoverWinRate: number
  gamesPlayed: number
}

export interface RoundRobinOptions {
  /** Games at each color assignment, per unordered pair. Total per pair = 2×. */
  gamesPerOrdering?: number
  /** Random plies at the start of each game (diversifies deterministic play). */
  openingPlies?: number
  seed?: number
  /** Elo anchor: the field's mean rating. */
  anchor?: number
  onProgress?: (played: number, total: number) => void
}

/**
 * Round-robin every pair of agents, playing both color assignments equally,
 * and fit Elo ratings from the results.
 */
export function roundRobin(
  agents: Agent[],
  options: RoundRobinOptions = {},
): RoundRobinResult {
  const n = agents.length
  const perOrdering = options.gamesPerOrdering ?? 100
  const openingPlies = options.openingPlies ?? 4
  const anchor = options.anchor ?? 1500
  let seed = (options.seed ?? 0x5eed) >>> 0

  // win[i][j] = fractional score of i vs j; games[i][j] = games between them.
  const win = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const games = Array.from({ length: n }, () => new Array<number>(n).fill(0))
  const wins = new Array<number>(n).fill(0)
  const draws = new Array<number>(n).fill(0)
  const losses = new Array<number>(n).fill(0)
  const firstScore = new Array<number>(n).fill(0)
  const firstGames = new Array<number>(n).fill(0)
  let firstWins = 0
  let decisive = 0
  let played = 0

  const total = n * (n - 1) * perOrdering
  // `first` moves first (player 1), `second` second.
  const record = (first: number, second: number, result: GameResult): void => {
    games[first][second]++
    games[second][first]++
    firstGames[first]++
    if (result === 'draw') {
      win[first][second] += 0.5
      win[second][first] += 0.5
      draws[first]++
      draws[second]++
      firstScore[first] += 0.5
    } else {
      decisive++
      const winner = result === 'a' ? first : second
      const loser = result === 'a' ? second : first
      win[winner][loser] += 1
      wins[winner]++
      losses[loser]++
      if (winner === first) {
        firstWins++
        firstScore[first] += 1
      }
    }
    played++
    options.onProgress?.(played, total)
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let g = 0; g < perOrdering; g++) {
        record(i, j, playGame(agents[i], agents[j], seed++, openingPlies))
        record(j, i, playGame(agents[j], agents[i], seed++, openingPlies))
      }
    }
  }

  const elo = fitElo(win, games, anchor)
  const standings: Standing[] = agents.map((agent, i) => ({
    name: agent.name,
    wins: wins[i],
    draws: draws[i],
    losses: losses[i],
    games: wins[i] + draws[i] + losses[i],
    score: wins[i] + 0.5 * draws[i],
    elo: elo[i],
    firstScore: firstScore[i],
    firstGames: firstGames[i],
  }))
  standings.sort((x, y) => y.elo - x.elo)

  return {
    standings,
    firstMoverWinRate: decisive > 0 ? firstWins / decisive : 0,
    gamesPlayed: played,
  }
}

/**
 * Bradley–Terry strengths via minorization–maximization (Zermelo's algorithm).
 * `win`/`games` are the fractional-win and game-count matrices; draws count as
 * half a win to each side. Returns positive strengths (gamma) with geometric
 * mean 1. Standard, dependency-free, and convergent for any connected field.
 */
export function fitBradleyTerry(
  win: number[][],
  games: number[][],
  iterations = 1000,
): number[] {
  const n = win.length
  const gamma = new Array<number>(n).fill(1)
  const totalWins = win.map((row) => row.reduce((a, b) => a + b, 0))

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Array<number>(n)
    for (let i = 0; i < n; i++) {
      if (totalWins[i] === 0) {
        next[i] = 1e-9 // never won: strength floored, not zero (log-safe)
        continue
      }
      let denom = 0
      for (let j = 0; j < n; j++) {
        if (j === i || games[i][j] === 0) continue
        denom += games[i][j] / (gamma[i] + gamma[j])
      }
      next[i] = denom > 0 ? totalWins[i] / denom : gamma[i]
    }
    // Renormalize to geometric mean 1 so ratings don't drift each iteration.
    const logMean =
      next.reduce((sum, g) => sum + Math.log(g), 0) / n
    const scale = Math.exp(-logMean)
    for (let i = 0; i < n; i++) gamma[i] = next[i] * scale
  }
  return gamma
}

/** Convert Bradley–Terry strengths to Elo, anchored to the field mean. */
export function fitElo(
  win: number[][],
  games: number[][],
  anchor = 1500,
): number[] {
  const gamma = fitBradleyTerry(win, games)
  return gamma.map((g) => anchor + (400 / Math.LN10) * Math.log(g))
}

/** Render a round-robin result as a fixed-width table for console output. */
export function formatLadder(result: RoundRobinResult): string {
  const header = [
    'agent'.padEnd(16),
    'elo'.padStart(6),
    'W'.padStart(5),
    'D'.padStart(5),
    'L'.padStart(5),
    'score%'.padStart(7),
    'as-1st%'.padStart(8),
  ].join('  ')
  const rows = result.standings.map((s) => {
    const scorePct = ((100 * s.score) / s.games).toFixed(1)
    const firstPct =
      s.firstGames > 0
        ? ((100 * s.firstScore) / s.firstGames).toFixed(1)
        : '—'
    return [
      s.name.padEnd(16),
      Math.round(s.elo).toString().padStart(6),
      s.wins.toString().padStart(5),
      s.draws.toString().padStart(5),
      s.losses.toString().padStart(5),
      scorePct.padStart(7),
      firstPct.padStart(8),
    ].join('  ')
  })
  const footer = `first-mover win rate (decisive games): ${(
    100 * result.firstMoverWinRate
  ).toFixed(1)}%  ·  ${result.gamesPlayed} games`
  return [header, ...rows, '', footer].join('\n')
}
