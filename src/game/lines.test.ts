import { describe, expect, it } from 'vitest'
import { CELL_COUNT, SIZE, coordToIndex, indexToCoord } from './coords.ts'
import { LINES, LINES_BY_CELL } from './lines.ts'

/** Order-independent identity for a line. */
const lineKey = (line: readonly number[]) =>
  [...line].sort((a, b) => a - b).join(',')

/** How many of the three axes vary along a line (1 = axis-aligned, 2 = plane diagonal, 3 = space diagonal). */
function varyingAxes(line: readonly number[]): number {
  const coords = line.map(indexToCoord)
  return (['x', 'y', 'z'] as const).filter(
    (axis) => new Set(coords.map((c) => c[axis])).size > 1,
  ).length
}

describe('LINES', () => {
  it('contains exactly 76 winning lines', () => {
    expect(LINES).toHaveLength(76)
  })

  it('contains no duplicate lines', () => {
    expect(new Set(LINES.map(lineKey)).size).toBe(76)
  })

  it('has 48 axis-aligned lines, 24 plane diagonals, and 4 space diagonals', () => {
    const counts = { 1: 0, 2: 0, 3: 0 }
    for (const line of LINES) {
      counts[varyingAxes(line) as 1 | 2 | 3]++
    }
    expect(counts).toEqual({ 1: 48, 2: 24, 3: 4 })
  })

  it('every line has 4 distinct in-range cells', () => {
    for (const line of LINES) {
      expect(line).toHaveLength(SIZE)
      expect(new Set(line).size).toBe(SIZE)
      for (const cell of line) {
        expect(cell).toBeGreaterThanOrEqual(0)
        expect(cell).toBeLessThan(CELL_COUNT)
      }
    }
  })

  it.each([
    {
      name: 'space diagonal [0,0,0] → [3,3,3]',
      cells: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
        { x: 2, y: 2, z: 2 },
        { x: 3, y: 3, z: 3 },
      ],
    },
    {
      name: 'z-axis line [0,1,0] → [0,1,3]',
      cells: [
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 1, z: 1 },
        { x: 0, y: 1, z: 2 },
        { x: 0, y: 1, z: 3 },
      ],
    },
    {
      name: 'xz plane diagonal [0,0,0] → [3,0,3]',
      cells: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 1 },
        { x: 2, y: 0, z: 2 },
        { x: 3, y: 0, z: 3 },
      ],
    },
  ])('includes the $name', ({ cells }) => {
    const key = lineKey(cells.map(coordToIndex))
    expect(LINES.map(lineKey)).toContain(key)
  })
})

describe('LINES_BY_CELL', () => {
  it('covers all 64 cells', () => {
    expect(LINES_BY_CELL).toHaveLength(CELL_COUNT)
  })

  it('every cell lies on at least 4 lines, 304 incidences total', () => {
    let total = 0
    for (const lineIds of LINES_BY_CELL) {
      expect(lineIds.length).toBeGreaterThanOrEqual(4)
      total += lineIds.length
    }
    expect(total).toBe(76 * 4)
  })

  it('corner and center cells lie on exactly 7 lines', () => {
    expect(LINES_BY_CELL[coordToIndex({ x: 0, y: 0, z: 0 })]).toHaveLength(7)
    expect(LINES_BY_CELL[coordToIndex({ x: 3, y: 3, z: 3 })]).toHaveLength(7)
    expect(LINES_BY_CELL[coordToIndex({ x: 1, y: 1, z: 1 })]).toHaveLength(7)
    expect(LINES_BY_CELL[coordToIndex({ x: 2, y: 2, z: 1 })]).toHaveLength(7)
  })

  it('is consistent with LINES: every listed line actually passes through the cell', () => {
    LINES_BY_CELL.forEach((lineIds, cell) => {
      for (const lineId of lineIds) {
        expect(LINES[lineId]).toContain(cell)
      }
    })
  })
})
