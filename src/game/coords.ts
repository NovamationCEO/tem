export const SIZE = 4
export const CELL_COUNT = SIZE ** 3

/**
 * Board cells live in a flat array of length 64, indexed as x + 4y + 16z.
 * Convention: `z` selects the layer (which flat grid in the UI), `x` the
 * column and `y` the row within a layer.
 */
export interface Coord {
  x: number
  y: number
  z: number
}

export function coordToIndex({ x, y, z }: Coord): number {
  return x + SIZE * y + SIZE * SIZE * z
}

export function indexToCoord(index: number): Coord {
  return {
    x: index % SIZE,
    y: Math.floor(index / SIZE) % SIZE,
    z: Math.floor(index / (SIZE * SIZE)),
  }
}

export function inBounds({ x, y, z }: Coord): boolean {
  return [x, y, z].every((v) => Number.isInteger(v) && v >= 0 && v < SIZE)
}
