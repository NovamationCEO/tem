import { useState } from 'react'
import { Board } from './Board.tsx'
import { applyMove } from './game/moves.ts'
import { newGame } from './game/state.ts'
import './App.css'

function App() {
  const [game, setGame] = useState(newGame)

  const status = game.status
  return (
    <main className="app">
      <header className="top">
        <h1>tem</h1>
        <button type="button" className="new-game" onClick={() => setGame(newGame())}>
          New game
        </button>
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
        onCellClick={(index) => setGame((g) => applyMove(g, index))}
      />
    </main>
  )
}

export default App
