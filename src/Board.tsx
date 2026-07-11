import { useState } from 'react'
import { SIZE, coordToIndex } from './game/coords.ts'
import type { GameState } from './game/state.ts'

interface BoardProps {
  state: GameState
  onCellClick: (index: number) => void
}

export function Board({ state, onCellClick }: BoardProps) {
  // Hovered (x, y) position, highlighted on every layer so vertical and
  // cross-layer lines are legible.
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null)

  const playing = state.status.kind === 'playing'
  const winningCells =
    state.status.kind === 'won' ? new Set(state.status.line) : null

  return (
    <div className="board">
      {Array.from({ length: SIZE }, (_, z) => (
        <section key={z} aria-label={`Layer ${z + 1}`}>
          <h2 className="layer-label">Layer {z + 1}</h2>
          <div className="grid" onMouseLeave={() => setHovered(null)}>
            {Array.from({ length: SIZE * SIZE }, (_, i) => {
              const x = i % SIZE
              const y = Math.floor(i / SIZE)
              const index = coordToIndex({ x, y, z })
              const cell = state.board[index]

              const classes = [
                'cell',
                cell === 1 && 'p1',
                cell === 2 && 'p2',
                winningCells?.has(index) && 'win',
                winningCells && !winningCells.has(index) && 'dim',
                playing &&
                  hovered?.x === x &&
                  hovered?.y === y &&
                  'hl',
              ]
                .filter(Boolean)
                .join(' ')

              const contents = cell === 1 ? '✕' : cell === 2 ? '○' : ''
              const label = `Layer ${z + 1}, row ${y + 1}, column ${x + 1}: ${
                cell === null ? 'empty' : `player ${cell}`
              }`

              return (
                <button
                  key={index}
                  type="button"
                  className={classes}
                  // Occupied cells stay enabled while playing so hover events
                  // still fire for the cross-layer highlight; the engine
                  // no-ops the click.
                  disabled={!playing}
                  aria-disabled={cell !== null || !playing}
                  aria-label={label}
                  onClick={() => onCellClick(index)}
                  onMouseEnter={() => setHovered({ x, y })}
                  onFocus={() => setHovered({ x, y })}
                  onBlur={() => setHovered(null)}
                >
                  {contents}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
