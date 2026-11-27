import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lines, stations } from '../../src/data/network'
import { buildTour, sampleTour } from '../../src/map/tour'

test('every line has a finite, varied 32 second cinematic tour', () => {
  for (const line of lines) {
    const shots = buildTour({ line: line.id })
    assert.equal(shots.at(-1)!.time, 32)
    assert.ok(Math.max(...shots.map(s => s.zoom)) >= 16.5)
    assert.ok(new Set(shots.map(s => s.pitch)).size >= 3)
    for (let t = 0; t <= 32; t += 0.05) {
      const c = sampleTour(shots, t)
      assert.ok([...c.center, c.zoom, c.bearing, c.pitch].every(Number.isFinite))
      assert.ok(c.pitch >= 45 && c.pitch <= 65)
      if (t > 0) {
        const prev = sampleTour(shots, t - 0.05)
        assert.ok(Math.abs(c.bearing - prev.bearing) < 3, 'no bearing snaps')
      }
    }
    assert.deepEqual(sampleTour(shots, -1), sampleTour(shots, 0))
    assert.deepEqual(sampleTour(shots, 100), sampleTour(shots, 32))
  }
})

test('selected station stays framed while orbiting with changing elevation', () => {
  const station = stations[0]
  const shots = buildTour({ station: station.id })
  assert.ok(shots.every(s => s.center[0] === station.lng && s.center[1] === station.lat))
  assert.ok(shots.at(-1)!.bearing - shots[0].bearing >= 180)
  assert.ok(new Set(shots.map(s => s.zoom)).size > 2)
})

test('tour completes once and cancellation removes animation and event listeners', async () => {
  const { startTour } = await import('../../src/map/three')
  const oldRaf = globalThis.requestAnimationFrame
  const oldCancel = globalThis.cancelAnimationFrame
  const pending = new Map<number, FrameRequestCallback>()
  let id = 0
  globalThis.requestAnimationFrame = cb => { pending.set(++id, cb); return id }
  globalThis.cancelAnimationFrame = key => { pending.delete(key) }
  try {
    for (const cancelEarly of [false, true]) {
      const events = new Map<string, () => void>()
      const container = new EventTarget()
      let ended = 0
      let moves = 0
      const map = {
        getContainer: () => container,
        on: (name: string, cb: () => void) => events.set(name, cb),
        once: (name: string, cb: () => void) => events.set(name, () => { events.delete(name); cb() }),
        off: (name: string) => events.delete(name),
        stop: () => {}, easeTo: () => {}, jumpTo: () => { moves++ },
      }
      const stop = startTour(map as unknown as Parameters<typeof startTour>[0], { station: stations[0].id }, () => { ended++ })
      if (cancelEarly) stop()
      else {
        events.get('moveend')!()
        let now = performance.now()
        for (let i = 0; pending.size && i < 81; i++) {
          now += 200
          const [key, cb] = pending.entries().next().value!
          pending.delete(key)
          cb(now)
        }
        assert.ok(moves >= 79 && moves <= 81)
        assert.equal(ended, 1, 'low frame rates must not stretch a 16-second station tour')
      }
      stop()
      container.dispatchEvent(new Event('mousedown'))
      assert.equal(ended, 1)
      assert.equal(pending.size, 0)
      assert.equal(events.size, 0)
    }
  } finally {
    globalThis.requestAnimationFrame = oldRaf
    globalThis.cancelAnimationFrame = oldCancel
  }
})
