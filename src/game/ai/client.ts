import type { GameState } from '../state.ts'
import { pickMoveForLevel, type Level } from './index.ts'
import { mulberry32 } from './random.ts'
import type { MoveRequest, MoveResponse } from './worker.ts'

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, (move: number) => void>()

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<MoveResponse>) => {
      const resolve = pending.get(event.data.id)
      pending.delete(event.data.id)
      resolve?.(event.data.move)
    }
  }
  return worker
}

/**
 * Ask the AI for a move. Runs in a Web Worker so Expert's search budget
 * never blocks the UI; falls back to a synchronous in-thread choice where
 * workers are unavailable.
 */
export function requestMove(state: GameState, level: Level): Promise<number> {
  if (state.status.kind !== 'playing') {
    return Promise.reject(new Error('game over'))
  }
  const turn = state.status.turn
  const seed = Math.floor(Math.random() * 2 ** 31)
  const w = getWorker()
  if (!w) {
    return Promise.resolve(pickMoveForLevel(state, level, mulberry32(seed)))
  }
  const id = nextId++
  const request: MoveRequest = {
    id,
    board: [...state.board],
    turn,
    moves: state.moves,
    level,
    seed,
  }
  return new Promise((resolve) => {
    pending.set(id, resolve)
    w.postMessage(request)
  })
}
