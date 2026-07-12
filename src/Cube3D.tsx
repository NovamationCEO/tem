import { Line, OrbitControls, useCursor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { DoubleSide, Spherical } from 'three'
import { EMPTY_RAMP, P1_RAMP, P2_RAMP } from './colors.ts'
import { SIZE, indexToCoord } from './game/coords.ts'
import type { GameState } from './game/state.ts'

const WIN_COLOR = '#22c55e'
const SPACING = 1.2

/**
 * Board (x, y, z) → scene position. Layers stack vertically with layer 1
 * (z = 0) at the TOP, matching the flat grids' top-to-bottom reading order;
 * `spread` (0–1) expands the whole lattice — every axis grows so sight lines
 * open up for picking, with extra vertical separation so the layers stay
 * visually distinct.
 */
function cellPosition(
  index: number,
  spread: number,
): [number, number, number] {
  const { x, y, z } = indexToCoord(index)
  const off = (SIZE - 1) / 2
  return [
    (x - off) * SPACING * (1 + spread),
    (off - z) * SPACING * (1 + spread * 1.5),
    (y - off) * SPACING * (1 + spread),
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
  const [drift, setDrift] = useState(0.35)
  // Whether the pointer is over a cell in THIS view (cursor feedback only).
  const [pointerInCell, setPointerInCell] = useState(false)
  // Interaction tracking for the idle camera weave: it only runs when the
  // pointer is off the canvas and nothing has been touched for a moment.
  const interaction = useRef({ last: 0, pointerOver: false })

  const playing = state.status.kind === 'playing'
  const turn = state.status.kind === 'playing' ? state.status.turn : null
  const winning = state.status.kind === 'won' ? state.status.line : null
  const winningSet = winning ? new Set(winning) : null
  const hoveredCoord = hovered === null ? null : indexToCoord(hovered)

  return (
    <div className="cube3d">
      <div
        className="cube3d-canvas"
        aria-hidden="true"
        onPointerEnter={() => {
          interaction.current.pointerOver = true
        }}
        onPointerLeave={() => {
          interaction.current.pointerOver = false
          interaction.current.last = performance.now()
        }}
        onPointerDown={() => {
          interaction.current.last = performance.now()
        }}
        onWheel={() => {
          interaction.current.last = performance.now()
        }}
      >
        <Canvas camera={{ position: [8.5, 4, 5], fov: 42 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[5, 10, 6]} intensity={1.4} />
          {Array.from({ length: SIZE }, (_, z) => (
            <LayerPlatform key={z} z={z} spread={spread} />
          ))}
          {Array.from({ length: SIZE ** 3 }, (_, index) => {
            const mark = state.board[index]
            const { x, y, z } = indexToCoord(index)
            const inHoveredColumn =
              hoveredCoord !== null &&
              hoveredCoord.x === x &&
              hoveredCoord.y === y
            const isWin = winningSet?.has(index) ?? false
            const isGhost = playing && mark === null && hovered === index
            const color = isWin
              ? WIN_COLOR
              : mark === 1
                ? P1_RAMP[z]
                : mark === 2
                  ? P2_RAMP[z]
                  : EMPTY_RAMP[z]
            const opacity =
              mark === null
                ? inHoveredColumn
                  ? 0.9
                  : 0.4
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
                      color={turn === 1 ? P1_RAMP[z] : P2_RAMP[z]}
                      transparent
                      opacity={0.5}
                    />
                  </mesh>
                ) : (
                  <mesh>
                    {mark === null ? (
                      <boxGeometry
                        args={
                          inHoveredColumn ? [0.32, 0.32, 0.32] : [0.2, 0.2, 0.2]
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
          <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />
          <CameraFit spread={spread} />
          <CameraWeave amount={drift} interaction={interaction} />
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
      <label className="spread">
        Camera drift
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={drift}
          onChange={(event) => setDrift(Number(event.target.value))}
        />
      </label>
    </div>
  )
}

interface CameraWeaveProps {
  amount: number
  interaction: React.RefObject<{ last: number; pointerOver: boolean }>
}

/**
 * Gentle idle sway that gives the static lattice a parallax depth cue. Only
 * active when the pointer is off the canvas and there has been no
 * interaction for a moment; eases in and out, and applies frame-to-frame
 * deltas of an oscillation so it composes with (never fights) manual
 * orbiting. `amount` (0–1, from the Camera drift slider) scales the sway up
 * to ~6 degrees; 0 disables it.
 */
function CameraWeave({ amount, interaction }: CameraWeaveProps) {
  const camera = useThree((s) => s.camera)
  const weight = useRef(0)
  const last = useRef({ theta: 0, phi: 0 })
  const spherical = useRef(new Spherical())

  useFrame((frameState, delta) => {
    const idle =
      !interaction.current.pointerOver &&
      performance.now() - interaction.current.last > 2000
    const target = idle && amount > 0 ? 1 : 0
    // Ease in slowly; back off quickly when the player reaches for the cube.
    weight.current +=
      (target - weight.current) * Math.min(1, delta * (target === 1 ? 0.5 : 4))

    const t = frameState.clock.elapsedTime
    const amp = amount * 0.1 * weight.current
    const theta = Math.sin(t * 0.4) * amp
    const phi = Math.sin(t * 0.17) * amp * 0.5
    const dTheta = theta - last.current.theta
    const dPhi = phi - last.current.phi
    last.current = { theta, phi }
    if (dTheta === 0 && dPhi === 0) return

    const s = spherical.current
    s.setFromVector3(camera.position)
    s.theta += dTheta
    s.phi = Math.min(Math.PI - 0.2, Math.max(0.2, s.phi + dPhi))
    camera.position.setFromSpherical(s)
    camera.lookAt(0, 0, 0)
  })
  return null
}

/**
 * Faint colored plane under each layer — the strong depth cue that keeps the
 * lattice parseable once marks accumulate. No pointer handlers, so it never
 * intercepts picking.
 */
function LayerPlatform({ z, spread }: { z: number; spread: number }) {
  const off = (SIZE - 1) / 2
  const y = (off - z) * SPACING * (1 + spread * 1.5) - 0.45
  const size = (SIZE - 1) * SPACING * (1 + spread) + 0.9
  return (
    <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        color={EMPTY_RAMP[z]}
        transparent
        opacity={0.1}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
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

/** Pull the camera back as the lattice expands so it stays framed. */
function CameraFit({ spread }: { spread: number }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.position.setLength(10.6 + spread * 5)
  }, [camera, spread])
  return null
}
