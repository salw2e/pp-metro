import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { haversine, lineLength, type LngLat } from '../../src/lib/geo.ts'

const net = JSON.parse(fs.readFileSync(new URL('../../src/data/network.json', import.meta.url), 'utf8'))

test('segment lengths add up to each line length (no overlap or gaps)', () => {
  for (const l of net.lines) {
    const sum = l.segments.reduce((a: number, s: { lengthM: number }) => a + s.lengthM, 0)
    assert.ok(Math.abs(sum - l.lengthM) / l.lengthM < 0.01, `${l.id}: ${sum} vs ${l.lengthM}`)
    const byType = Object.values(l.byType as Record<string, number>).reduce((a, b) => a + b, 0)
    assert.ok(Math.abs(byType - sum) <= l.segments.length, `${l.id} by type`)
  }
})

test('stored lengths match the geometry', () => {
  for (const l of net.lines) for (const s of l.segments) {
    assert.ok(Math.abs(lineLength(s.coords as LngLat[]) - s.lengthM) < 2, `${l.id} ${s.from}-${s.to}`)
  }
})

// a single-line station must sit on its line; at an interchange the second line's platform may be offset within the
// same station complex, which is normally 150 to 200 m long, so up to 50 m is accepted there
test('every station lies on each of its lines', () => {
  for (const s of net.stations) for (const lid of s.lines) {
    const l = net.lines.find((x: { id: string }) => x.id === lid)
    const pts = l.segments.flatMap((g: { coords: LngLat[] }) => g.coords)
    const d = Math.min(...pts.map((p: LngLat) => haversine(p, [s.lng, s.lat])))
    assert.ok(d < (s.interchange ? 50 : 5), `${s.id} is ${d.toFixed(0)} m from ${lid}`)
  }
})

test('no two stations on the same line are closer than 600 m', () => {
  for (const l of net.lines) {
    const st = l.stations.map((id: string) => net.stations.find((s: { id: string }) => s.id === id))
    for (let i = 1; i < st.length; i++) {
      const d = haversine([st[i - 1].lng, st[i - 1].lat], [st[i].lng, st[i].lat])
      assert.ok(d >= 600, `${l.id}: ${st[i - 1].id}-${st[i].id} ${d.toFixed(0)} m`)
    }
  }
})

test('station codes are unique and interchanges are shared stations', () => {
  const codes = net.stations.flatMap((s: { codes: string[] }) => s.codes)
  assert.equal(new Set(codes).size, codes.length)
  for (const s of net.stations) assert.equal(s.interchange, new Set(s.lines).size > 1)
})

test('every station has both an English and a Khmer name', () => {
  for (const s of net.stations) {
    assert.ok(s.en.length > 1)
    assert.match(s.km, /[ក-៿]/, s.id)
  }
})

test('the network uses no curve tighter than 150 m on the new lines', () => {
  for (const l of net.lines) if (l.curves) assert.ok(l.curves.minRadiusM >= 150, `${l.id}: ${l.curves.minRadiusM} m`)
})

test('interchange platforms are within one station complex (under 150 m apart)', () => {
  for (const s of net.stations) if (s.interchange) assert.ok(s.platformOffsetM < 150, `${s.id}: ${s.platformOffsetM} m`)
})
