import { describe, expect, it } from 'vitest'
import {
  fitElo,
  formatLadder,
  heuristicAgent,
  playGame,
  roundRobin,
  searchAgent,
} from './selfplay.ts'

describe('playGame', () => {
  it('is deterministic given the same seed and openings', () => {
    const a = heuristicAgent(2)
    const b = heuristicAgent(1)
    const first = playGame(a, b, 12345, 4)
    const second = playGame(a, b, 12345, 4)
    expect(first).toBe(second)
  })

  it('always terminates with a valid result', () => {
    const a = searchAgent(2)
    const b = heuristicAgent(1)
    for (let seed = 0; seed < 8; seed++) {
      expect(['a', 'b', 'draw']).toContain(playGame(a, b, seed, 4))
    }
  })

  it('two deterministic agents vary once openings are randomized', () => {
    const a = searchAgent(2)
    const b = searchAgent(2)
    // With no random opening both are RNG-free, so every game is identical.
    expect(playGame(a, b, 1, 0)).toBe(playGame(a, b, 999, 0))
    // A random opening decorrelates games across seeds.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => playGame(a, b, s, 6))
    expect(new Set(seeds).size).toBeGreaterThan(1)
  })

  it('a deeper search beats the weakest heuristic head-to-head', () => {
    const strong = searchAgent(3)
    const weak = heuristicAgent(1)
    let strongScore = 0
    const rounds = 12
    for (let seed = 0; seed < rounds; seed++) {
      // Alternate colors so the first-move advantage does not decide it.
      if (playGame(strong, weak, seed, 4) === 'a') strongScore++
      if (playGame(weak, strong, seed + 500, 4) === 'b') strongScore++
    }
    // A clear skill gap should win a large majority of 2×rounds games.
    expect(strongScore).toBeGreaterThan(rounds)
  })
})

describe('fitElo', () => {
  it('orders a strict transitive chain A > B > C', () => {
    // A beats B and C every game; B beats C every game.
    const win = [
      [0, 10, 10],
      [0, 0, 10],
      [0, 0, 0],
    ]
    const games = [
      [0, 10, 10],
      [10, 0, 10],
      [10, 10, 0],
    ]
    const elo = fitElo(win, games)
    expect(elo[0]).toBeGreaterThan(elo[1])
    expect(elo[1]).toBeGreaterThan(elo[2])
  })

  it('rates evenly-matched agents equally', () => {
    const win = [
      [0, 5],
      [5, 0],
    ]
    const games = [
      [0, 10],
      [10, 0],
    ]
    const elo = fitElo(win, games)
    expect(Math.abs(elo[0] - elo[1])).toBeLessThan(1)
  })

  it('anchors ratings to the requested field mean', () => {
    const win = [
      [0, 7],
      [3, 0],
    ]
    const games = [
      [0, 10],
      [10, 0],
    ]
    const elo = fitElo(win, games, 1500)
    expect((elo[0] + elo[1]) / 2).toBeCloseTo(1500, 5)
  })
})

describe('roundRobin', () => {
  it('tallies consistently and ranks the stronger agent first', () => {
    const result = roundRobin([searchAgent(3), heuristicAgent(1)], {
      gamesPerOrdering: 6,
      seed: 7,
    })
    expect(result.gamesPlayed).toBe(12) // 2 orderings × 6
    // Every game increments exactly two agents' game counts.
    const totalGames = result.standings.reduce((n, s) => n + s.games, 0)
    expect(totalGames).toBe(24)
    // Wins and losses balance across the field; draws are mutual.
    const totalWins = result.standings.reduce((n, s) => n + s.wins, 0)
    const totalLosses = result.standings.reduce((n, s) => n + s.losses, 0)
    expect(totalWins).toBe(totalLosses)
    expect(result.standings[0].name).toBe('search-d3')
    expect(result.standings[0].elo).toBeGreaterThan(result.standings[1].elo)
  })

  it('reports a plausible first-mover win rate', () => {
    const result = roundRobin([heuristicAgent(2), heuristicAgent(2)], {
      gamesPerOrdering: 20,
      seed: 3,
    })
    expect(result.firstMoverWinRate).toBeGreaterThanOrEqual(0)
    expect(result.firstMoverWinRate).toBeLessThanOrEqual(1)
    expect(formatLadder(result)).toContain('heuristic-L2')
  })
})
