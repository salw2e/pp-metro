import { test } from 'node:test'
import assert from 'node:assert/strict'
import { railStrips } from '../../src/map/rail-geometry'
import type { LngLat } from '../../src/lib/geo'

test('curved deck pieces share exactly the same edges without gaps or overlaps', () => {
  const coords: LngLat[] = Array.from({ length: 40 }, (_, i) => [104.9 + Math.sin(i / 35) * 0.01, 11.55 + Math.cos(i / 35) * 0.01])
  const pieces = railStrips(coords, 5)
  assert.equal(pieces.length, 3)
  for (let i = 1; i < pieces.length; i++) {
    const previous = pieces[i - 1], next = pieces[i]
    const n = (previous.length - 1) / 2
    assert.deepEqual(previous[n - 1], next[0])
    assert.deepEqual(previous[n], next[next.length - 2])
  }
  assert.ok(pieces.flat(2).every(Number.isFinite))
})
