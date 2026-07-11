import {
  CELL_COUNT,
  SIZE,
  coordToIndex,
  indexToCoord,
  inBounds,
  type Coord,
} from './coords.ts'

/**
 * The 13 canonical direction vectors: all nonzero (dx, dy, dz) in {-1, 0, 1}³
 * whose first nonzero component is positive, so each line is generated from
 * exactly one of its two traversal directions.
 */
function canonicalDirections(): Coord[] {
  const dirs: Coord[] = []
  for (const x of [-1, 0, 1]) {
    for (const y of [-1, 0, 1]) {
      for (const z of [-1, 0, 1]) {
        if (x === 0 && y === 0 && z === 0) continue
        const firstNonZero = x !== 0 ? x : y !== 0 ? y : z
        if (firstNonZero > 0) dirs.push({ x, y, z })
      }
    }
  }
  return dirs
}

function step(from: Coord, dir: Coord, times: number): Coord {
  return {
    x: from.x + dir.x * times,
    y: from.y + dir.y * times,
    z: from.z + dir.z * times,
  }
}

function generateLines(): number[][] {
  const lines: number[][] = []
  for (const dir of canonicalDirections()) {
    for (let index = 0; index < CELL_COUNT; index++) {
      const start = indexToCoord(index)
      const isLineStart =
        !inBounds(step(start, dir, -1)) && inBounds(step(start, dir, SIZE - 1))
      if (!isLineStart) continue
      lines.push(
        Array.from({ length: SIZE }, (_, i) => coordToIndex(step(start, dir, i))),
      )
    }
  }
  return lines
}

/** All 76 winning lines, each as 4 cell indices in traversal order. */
export const LINES: readonly (readonly number[])[] = generateLines()

/** For each cell index, the ids (positions in LINES) of lines through it. */
export const LINES_BY_CELL: readonly (readonly number[])[] = (() => {
  const byCell: number[][] = Array.from({ length: CELL_COUNT }, () => [])
  LINES.forEach((line, lineId) => {
    for (const cell of line) byCell[cell].push(lineId)
  })
  return byCell
})()
