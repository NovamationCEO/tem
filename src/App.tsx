import { useMemo, useState } from 'react'
import { Board } from './Board.tsx'
import {
  canUndo,
  currentState,
  newHistory,
  pushMove,
  undo,
} from './game/history.ts'
import { threats } from './game/queries.ts'
import type { Player } from './game/state.ts'
import './App.css'

const THREATS_KEY = 'tem.showThreats'

function App() {
  const [history, setHistory] = useState(newHistory)
  const [showThreats, setShowThreats] = useState(
    () => localStorage.getItem(THREATS_KEY) === '1',
  )
  const game = currentState(history)

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

  const status = game.status
  return (
    <main className="app">
      <header className="top">
        <h1>tem</h1>
        <div className="controls">
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
            onClick={() => setHistory(undo)}
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
            Player {status.turn}&rsquo;s turn
          </>
        )}
        {status.kind === 'won' && <>Player {status.winner} wins!</>}
        {status.kind === 'draw' && <>Draw — the board is full.</>}
      </p>

      <Board
        state={game}
        threats={threatMap}
        onCellClick={(index) => setHistory((h) => pushMove(h, index))}
      />
    </main>
  )
}

export default App
