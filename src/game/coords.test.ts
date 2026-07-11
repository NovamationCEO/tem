import { describe, expect, it } from 'vitest'
import { CELL_COUNT, coordToIndex, inBounds, indexToCoord } from './coords.ts'

describe('coords', () => {
  it('round-trips every index through indexToCoord and back', () => {
    for (let index = 0; index < CELL_COUNT; index++) {
      expect(coordToIndex(indexToCoord(index))).toBe(index)
    }
  })

  it('maps known coordinates to expected indices', () => {
    expect(coordToIndex({ x: 0, y: 0, z: 0 })).toBe(0)
    expect(coordToIndex({ x: 3, y: 0, z: 0 })).toBe(3)
    expect(coordToIndex({ x: 0, y: 1, z: 0 })).toBe(4)
    expect(coordToIndex({ x: 0, y: 0, z: 1 })).toBe(16)
    expect(coordToIndex({ x: 3, y: 3, z: 3 })).toBe(CELL_COUNT - 1)
  })

  it('produces only in-bounds coordinates from valid indices', () => {
    for (let index = 0; index < CELL_COUNT; index++) {
      expect(inBounds(indexToCoord(index))).toBe(true)
    }
  })

  it('rejects out-of-bounds and non-integer coordinates', () => {
    expect(inBounds({ x: -1, y: 0, z: 0 })).toBe(false)
    expect(inBounds({ x: 4, y: 0, z: 0 })).toBe(false)
    expect(inBounds({ x: 0, y: 4, z: 0 })).toBe(false)
    expect(inBounds({ x: 0, y: 0, z: 4 })).toBe(false)
    expect(inBounds({ x: 1.5, y: 0, z: 0 })).toBe(false)
  })
})
