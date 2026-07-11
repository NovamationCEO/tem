import { useRef, useState } from 'react'
import { SIZE, coordToIndex, indexToCoord } from './game/coords.ts'
import type { GameState, Player } from './game/state.ts'

interface BoardProps {
  state: GameState
  /** Empty cells that complete four-in-a-row, by threatening player. */
  threats?: ReadonlyMap<number, readonly Player[]>
  onCellClick: (index: number) => void
}

const clamp = (v: number) => Math.min(SIZE - 1, Math.max(0, v))

function keyToDelta(key: string): [number, number, number] | null {
  switch (key) {
    case 'ArrowLeft':
      return [-1, 0, 0]
    case 'ArrowRight':
      return [1, 0, 0]
    case 'ArrowUp':
      return [0, -1, 0]
    case 'ArrowDown':
      return [0, 1, 0]
    case 'PageUp':
    case '[':
      return [0, 0, -1]
    case 'PageDown':
    case ']':
      return [0, 0, 1]
    default:
      return null
  }
}

export function Board({ state, threats, onCellClick }: BoardProps) {
  // Hovered (x, y) position, highlighted on every layer so vertical and
  // cross-layer lines are legible.
  const [hovered, setHovered] = useState<{ x: number; y: number } | null>(null)
  // Roving tabindex: the whole board is a single tab stop; arrows and
  // PageUp/PageDown (or [ and ]) move focus between cells and layers.
  const [focused, setFocused] = useState(0)
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([])

  const playing = state.status.kind === 'playing'
  const winningCells =
    state.status.kind === 'won' ? new Set(state.status.line) : null

  function handleKeyDown(event: React.KeyboardEvent, from: number) {
    if (event.key === 'Enter' || event.key === ' ') {
      // Explicit activation (with preventDefault so native activation can't
      // double-fire) — keeps Enter and Space on a single code path.
      event.preventDefault()
      onCellClick(from)
      return
    }
    const delta = keyToDelta(event.key)
    if (!delta) return
    event.preventDefault()
    const [dx, dy, dz] = delta
    const c = indexToCoord(from)
    const target = coordToIndex({
      x: clamp(c.x + dx),
      y: clamp(c.y + dy),
      z: clamp(c.z + dz),
    })
    setFocused(target)
    cellRefs.current[target]?.focus()
  }

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
                playing && hovered?.x === x && hovered?.y === y && 'hl',
              ]
                .filter(Boolean)
                .join(' ')

              const threatPlayers =
                cell === null ? (threats?.get(index) ?? []) : []
              const contents =
                cell === 1 ? (
                  '✕'
                ) : cell === 2 ? (
                  '○'
                ) : threatPlayers.length > 0 ? (
                  <span className="threat-dots" aria-hidden="true">
                    {threatPlayers.map((p) => (
                      <span key={p} className={`threat-dot p${p}`} />
                    ))}
                  </span>
                ) : (
                  ''
                )
              const threatNote =
                threatPlayers.length > 0
                  ? `, winning move for ${threatPlayers
                      .map((p) => `player ${p}`)
                      .join(' and ')}`
                  : ''
              const label = `Layer ${z + 1}, row ${y + 1}, column ${x + 1}: ${
                cell === null ? 'empty' : `player ${cell}`
              }${threatNote}`

              return (
                <button
                  key={index}
                  ref={(el) => {
                    cellRefs.current[index] = el
                  }}
                  type="button"
                  className={classes}
                  // Occupied cells stay enabled while playing so hover events
                  // still fire for the cross-layer highlight; the engine
                  // no-ops the click.
                  disabled={!playing}
                  aria-disabled={cell !== null || !playing}
                  aria-label={label}
                  tabIndex={index === focused ? 0 : -1}
                  onClick={() => onCellClick(index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  onMouseEnter={() => setHovered({ x, y })}
                  onFocus={() => {
                    setFocused(index)
                    setHovered({ x, y })
                  }}
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
