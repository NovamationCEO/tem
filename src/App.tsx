import { useEffect, useMemo, useState } from 'react'
import { Board } from './Board.tsx'
import { Cube3D } from './Cube3D.tsx'
import { chooseMove, type Level } from './game/ai/heuristic.ts'
import {
  canUndo,
  currentState,
  newHistory,
  pushMove,
  undo,
  type History,
} from './game/history.ts'
import { threats } from './game/queries.ts'
import type { Player } from './game/state.ts'
import './App.css'

const THREATS_KEY = 'tem.showThreats'
const MODE_KEY = 'tem.mode'
const LEVEL_KEY = 'tem.level'

type Mode = 'hotseat' | 'ai'

const LEVEL_NAMES: Record<Level, string> = {
  1: 'Beginner',
  2: 'Casual',
  3: 'Challenging',
  4: 'Expert',
}

function App() {
  const [history, setHistory] = useState(newHistory)
  const [showThreats, setShowThreats] = useState(
    () => localStorage.getItem(THREATS_KEY) === '1',
  )
  const [mode, setMode] = useState<Mode>(() =>
    localStorage.getItem(MODE_KEY) === 'ai' ? 'ai' : 'hotseat',
  )
  const [level, setLevel] = useState<Level>(() => {
    const stored = Number(localStorage.getItem(LEVEL_KEY))
    return stored >= 1 && stored <= 4 ? (stored as Level) : 3
  })
  const [hovered, setHovered] = useState<number | null>(null)
  const game = currentState(history)

  // The computer plays player 2. A short delay keeps the reply readable;
  // the currentState guard drops the move if the game changed underneath
  // (undo, reset, mode switch) while it was pending.
  const aiToMove =
    mode === 'ai' && game.status.kind === 'playing' && game.status.turn === 2
  useEffect(() => {
    if (!aiToMove) return
    const timer = setTimeout(() => {
      void chooseMove(game, level).then((move) => {
        setHistory((h) => (currentState(h) === game ? pushMove(h, move) : h))
      })
    }, 450)
    return () => clearTimeout(timer)
  }, [aiToMove, game, level])

  const threatMap = useMemo(() => {
    const map = new Map<number, Player[]>()
    if (!showThreats) return map
    for (const threat of threats(game)) {
      const players = map.get(threat.cell) ?? []
      if (!players.includes(threat.player)) {
        map.set(threat.cell, [...players, threat.player])
      }
    }
    return map
  }, [game, showThreats])

  function toggleThreats() {
    setShowThreats((shown) => {
      localStorage.setItem(THREATS_KEY, shown ? '0' : '1')
      return !shown
    })
  }

  function changeMode(next: Mode) {
    localStorage.setItem(MODE_KEY, next)
    setMode(next)
  }

  function changeLevel(next: Level) {
    localStorage.setItem(LEVEL_KEY, String(next))
    setLevel(next)
  }

  // In AI mode, undo rewinds to the human's turn (popping the computer's
  // reply too); otherwise the effect above would immediately replay it.
  function handleUndo() {
    setHistory((h) => {
      let next = undo(h)
      const s = currentState(next)
      if (mode === 'ai' && s.status.kind === 'playing' && s.status.turn === 2) {
        next = undo(next)
      }
      return next
    })
  }

  function handleCellClick(index: number) {
    // In AI mode the human only moves as player 1.
    if (aiToMove) return
    setHistory((h: History) => pushMove(h, index))
  }

  const status = game.status
  return (
    <main className="app">
      <header className="top">
        <h1>tem</h1>
        <div className="controls">
          <select
            className="select"
            aria-label="Opponent"
            value={mode}
            onChange={(event) => changeMode(event.target.value as Mode)}
          >
            <option value="hotseat">Two players</option>
            <option value="ai">vs Computer</option>
          </select>
          {mode === 'ai' && (
            <select
              className="select"
              aria-label="Difficulty"
              value={level}
              onChange={(event) =>
                changeLevel(Number(event.target.value) as Level)
              }
            >
              {([1, 2, 3, 4] as const).map((l) => (
                <option key={l} value={l}>
                  {LEVEL_NAMES[l]}
                </option>
              ))}
            </select>
          )}
          <label className="toggle">
            <input
              type="checkbox"
              checked={showThreats}
              onChange={toggleThreats}
            />
            Show threats
          </label>
          <button
            type="button"
            className="btn"
            disabled={!canUndo(history)}
            onClick={handleUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setHistory(newHistory())}
          >
            New game
          </button>
        </div>
      </header>

      <p
        className={status.kind === 'won' ? 'status won' : 'status'}
        aria-live="polite"
      >
        {status.kind === 'playing' && (
          <>
            <span className={`dot p${status.turn}`} aria-hidden="true" />
            {mode === 'ai'
              ? status.turn === 1
                ? 'Your turn'
                : 'Computer is thinking…'
              : `Player ${status.turn}’s turn`}
          </>
        )}
        {status.kind === 'won' &&
          (mode === 'ai'
            ? status.winner === 1
              ? 'You win!'
              : 'Computer wins!'
            : `Player ${status.winner} wins!`)}
        {status.kind === 'draw' && <>Draw — the board is full.</>}
      </p>

      <div className="views">
        <Board
          state={game}
          threats={threatMap}
          hovered={hovered}
          onHover={setHovered}
          onCellClick={handleCellClick}
        />
        <Cube3D
          state={game}
          hovered={hovered}
          onHover={setHovered}
          onCellClick={handleCellClick}
        />
      </div>
    </main>
  )
}

export default App
