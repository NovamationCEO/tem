import { Line, OrbitControls, useCursor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useState } from 'react'
import { SIZE, indexToCoord } from './game/coords.ts'
import type { GameState } from './game/state.ts'

// Mid-ramp colors that read on both light and dark canvas backgrounds.
const P1_COLOR = '#8b5cf6'
const P2_COLOR = '#14b8a6'
const EMPTY_COLOR = '#8a8794'
const WIN_COLOR = '#22c55e'
const SPACING = 1.2

/**
 * Board (x, y, z) → scene position. Layers stack vertically (layer 1 at the
 * bottom); `spread` (0–1) pulls them apart so interior cells become visible.
 */
function cellPosition(
  index: number,
  spread: number,
): [number, number, number] {
  const { x, y, z } = indexToCoord(index)
  const off = (SIZE - 1) / 2
  return [
    (x - off) * SPACING,
    (z - off) * SPACING * (1 + spread * 2),
    (y - off) * SPACING,
  ]
}

interface Cube3DProps {
  state: GameState
  /** Hovered cell index shared with the flat grids: its (x, y) column
   * highlights everywhere, and the cell itself gets a ghost preview. */
  hovered: number | null
  onHover: (index: number | null) => void
  onCellClick: (index: number) => void
}

export function Cube3D({ state, hovered, onHover, onCellClick }: Cube3DProps) {
  const [spread, setSpread] = useState(0)
  // Whether the pointer is over a cell in THIS view (cursor feedback only).
  const [pointerInCell, setPointerInCell] = useState(false)

  const playing = state.status.kind === 'playing'
  const turn = state.status.kind === 'playing' ? state.status.turn : null
  const winning = state.status.kind === 'won' ? state.status.line : null
  const winningSet = winning ? new Set(winning) : null
  const hoveredCoord = hovered === null ? null : indexToCoord(hovered)

  return (
    <div className="cube3d">
      <div className="cube3d-canvas" aria-hidden="true">
        <Canvas camera={{ position: [8.5, 4, 5], fov: 42 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 10, 6]} intensity={1.4} />
          {Array.from({ length: SIZE ** 3 }, (_, index) => {
            const mark = state.board[index]
            const { x, y } = indexToCoord(index)
            const inHoveredColumn =
              hoveredCoord !== null &&
              hoveredCoord.x === x &&
              hoveredCoord.y === y
            const isWin = winningSet?.has(index) ?? false
            const isGhost = playing && mark === null && hovered === index
            const color = isWin
              ? WIN_COLOR
              : mark === 1
                ? P1_COLOR
                : mark === 2
                  ? P2_COLOR
                  : EMPTY_COLOR
            const opacity =
              mark === null
                ? inHoveredColumn
                  ? 0.85
                  : 0.3
                : winningSet && !isWin
                  ? 0.35
                  : 1
            const position = cellPosition(index, spread)
            return (
              <group key={index} position={position}>
                {isGhost ? (
                  <mesh>
                    <sphereGeometry args={[0.34, 24, 24]} />
                    <meshStandardMaterial
                      color={turn === 1 ? P1_COLOR : P2_COLOR}
                      transparent
                      opacity={0.5}
                    />
                  </mesh>
                ) : (
                  <mesh>
                    {mark === null ? (
                      <boxGeometry
                        args={
                          inHoveredColumn ? [0.3, 0.3, 0.3] : [0.16, 0.16, 0.16]
                        }
                      />
                    ) : (
                      <sphereGeometry args={[0.34, 24, 24]} />
                    )}
                    <meshStandardMaterial
                      color={color}
                      transparent
                      opacity={opacity}
                    />
                  </mesh>
                )}
                <Hitbox
                  playing={playing}
                  onOver={() => {
                    onHover(index)
                    setPointerInCell(true)
                  }}
                  onOut={() => {
                    onHover(null)
                    setPointerInCell(false)
                  }}
                  onPick={() => onCellClick(index)}
                />
              </group>
            )
          })}
          {winning && (
            <Line
              points={winning.map((cell) => cellPosition(cell, spread))}
              color={WIN_COLOR}
              lineWidth={3}
            />
          )}
          <OrbitControls enablePan={false} minDistance={5} maxDistance={16} />
          <CursorHint active={playing && pointerInCell} />
        </Canvas>
      </div>
      <label className="spread">
        Spread layers
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={spread}
          onChange={(event) => setSpread(Number(event.target.value))}
        />
      </label>
    </div>
  )
}

interface HitboxProps {
  playing: boolean
  onOver: () => void
  onOut: () => void
  onPick: () => void
}

/**
 * Invisible click/hover target, much larger than the visible cell geometry.
 * The raycaster returns the nearest hit, so exactly one cell responds.
 */
function Hitbox({ playing, onOver, onOut, onPick }: HitboxProps) {
  return (
    <mesh
      onClick={(event) => {
        event.stopPropagation()
        // A real click, not the tail end of an orbit drag.
        if (playing && event.delta <= 5) onPick()
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (playing) onOver()
      }}
      onPointerOut={onOut}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function CursorHint({ active }: { active: boolean }) {
  useCursor(active)
  return null
}
