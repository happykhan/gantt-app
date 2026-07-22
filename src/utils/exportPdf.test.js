import { describe, expect, it } from 'vitest'
import { createPdfTilePlan } from './exportPdf'

describe('tiled PDF planning', () => {
  it('splits a large chart into contiguous readable page crops', () => {
    const tiles = createPdfTilePlan(3200, 2400, 277, 190)

    expect(tiles).toHaveLength(9)
    expect(tiles[0]).toEqual({ x: 0, y: 0, width: 1385, height: 950 })
    expect(tiles.at(-1).x + tiles.at(-1).width).toBe(3200)
    expect(tiles.at(-1).y + tiles.at(-1).height).toBe(2400)
    expect(tiles.every(tile => tile.width <= 1385 && tile.height <= 950)).toBe(true)
  })

  it('keeps a small chart on one tiled page', () => {
    expect(createPdfTilePlan(900, 600, 277, 190)).toEqual([
      { x: 0, y: 0, width: 900, height: 600 },
    ])
  })
})
