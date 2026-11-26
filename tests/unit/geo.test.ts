import { test } from 'node:test'
import assert from 'node:assert/strict'
import { haversine, lineLength, filletPolyline, minRadius, nearestOnLine, pointInPolygon, addPlatforms, type LngLat } from '../../src/lib/geo.ts'

test('haversine: one degree of latitude is about 111.2 km', () => {
  const d = haversine([104.9, 11.5], [104.9, 12.5])
  assert.ok(Math.abs(d - 111195) < 50, String(d))
})

test('haversine: Central Market to Independence Monument (OSM points) is about 1.6 km', () => {
  const d = haversine([104.921081, 11.569601], [104.9281893, 11.5564378])
  assert.ok(d > 1550 && d < 1750, String(d))
})

test('fillet replaces a right-angle corner with the requested radius', () => {
  // 1 km east then 1 km north, around 11.5 N
  const a: LngLat = [104.9, 11.5]
  const b: LngLat = [104.9 + 1000 / (111195 * Math.cos((11.5 * Math.PI) / 180)), 11.5]
  const c: LngLat = [b[0], 11.5 + 1000 / 111195]
  const { coords, radii } = filletPolyline([a, b, c], 300, 5)
  assert.equal(radii.length, 1)
  assert.ok(Math.abs(radii[0] - 300) < 1e-6)
  const r = minRadius(coords, 20)
  assert.ok(r > 280 && r < 320, String(r))
  // arc length replaces 2 x 300 m of tangent with pi/2 x 300 m
  const expected = 2000 - 600 + (Math.PI / 2) * 300
  assert.ok(Math.abs(lineLength(coords) - expected) < 5, String(lineLength(coords)))
})

test('fillet radius shrinks when the straights are too short, and the cap is respected', () => {
  const k = 111195 * Math.cos((11.5 * Math.PI) / 180)
  const pts: LngLat[] = [[104.9, 11.5], [104.9 + 100 / k, 11.5], [104.9 + 100 / k, 11.5 + 100 / 111195]]
  const { radii } = filletPolyline(pts, 300)
  // half the 100 m outgoing straight is available: tangent 50 m, radius 50 m for a 90 degree turn
  assert.ok(Math.abs(radii[0] - 50) < 0.01, String(radii[0]))
  const capped = filletPolyline(pts, 300, 10, () => 20)
  assert.ok(Math.abs(capped.radii[0] - 20) < 0.01)
})

test('platform straightening keeps 150 m of straight track through a bent station', () => {
  const k = 111195 * Math.cos((11.5 * Math.PI) / 180)
  const station: LngLat = [104.9 + 1000 / k, 11.5]
  const line: LngLat[] = [[104.9, 11.5], station, [station[0], 11.5 + 1000 / 111195]]
  const plat = addPlatforms(line, [station])
  assert.equal(plat.coords.length, 4)
  const { coords } = filletPolyline(plat.coords, 300, 5, i => (plat.isEnd[i] ? 75 : Infinity))
  // the station must now sit on straight track: radius over +-60 m is effectively infinite
  const n = nearestOnLine(station, coords)
  assert.ok(n.dist < 60, `station ${n.dist} m off the line`)
  const near = coords.filter(p => haversine(p, n.point) < 60)
  if (near.length >= 3) assert.ok(minRadius(near, 20) > 5000)
})

test('nearestOnLine respects the starting distance', () => {
  const k = 111195 * Math.cos((11.5 * Math.PI) / 180)
  // a line that goes 1 km east and comes back
  const line: LngLat[] = [[104.9, 11.5], [104.9 + 1000 / k, 11.5], [104.9 + 1000 / k, 11.5 + 10 / 111195], [104.9, 11.5 + 10 / 111195]]
  const p: LngLat = [104.9 + 200 / k, 11.5]
  assert.ok(nearestOnLine(p, line).along < 250)
  assert.ok(nearestOnLine(p, line, 1000).along > 1500)
})

test('point in polygon with a hole', () => {
  const outer: LngLat[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
  const hole: LngLat[] = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]
  const g = { type: 'Polygon' as const, coordinates: [outer, hole] }
  assert.equal(pointInPolygon([1, 1], g), true)
  assert.equal(pointInPolygon([5, 5], g), false)
  assert.equal(pointInPolygon([11, 5], g), false)
})
