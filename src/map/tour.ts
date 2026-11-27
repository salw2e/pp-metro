import { lines, stationById } from '../data/network'
import { projector, type LngLat } from '../lib/geo'

export interface TourFrame {
  time: number
  center: LngLat
  zoom: number
  pitch: number
  bearing: number
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const turn = (from: number, to: number) => from + ((to - from) % 360 + 540) % 360 - 180

/** Real network locations, composed as a short presentation rather than a full route traversal. */
export function buildTour(target: { line?: string; station?: string }): TourFrame[] {
  const station = target.station ? stationById.get(target.station) : undefined
  if (station) {
    const center: LngLat = [station.lng, station.lat]
    return [
      { time: 0, center, zoom: 15.8, pitch: 48, bearing: -45 },
      { time: 4, center, zoom: 16.7, pitch: 62, bearing: 15 },
      { time: 10, center, zoom: 16.5, pitch: 58, bearing: 110 },
      { time: 16, center, zoom: 15.6, pitch: 50, bearing: 205 },
    ]
  }
  const line = lines.find(l => l.id === target.line) ?? lines[0]
  const coords = line.segments.flatMap(s => s.coords)
  const pr = projector(coords[0][1])
  const points = coords.map(pr.fwd)
  const distances = [0]
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  const total = distances.at(-1)!
  const at = (distance: number): LngLat => {
    const d = Math.max(0, Math.min(total, distance))
    const i = Math.max(1, distances.findIndex(v => v >= d))
    const t = (d - distances[i - 1]) / (distances[i] - distances[i - 1] || 1)
    return pr.inv([mix(points[i - 1][0], points[i][0], t), mix(points[i - 1][1], points[i][1], t)])
  }
  const nearest = (p: LngLat) => {
    const q = pr.fwd(p)
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.hypot(points[i][0] - q[0], points[i][1] - q[1]) < Math.hypot(points[best][0] - q[0], points[best][1] - q[1])) best = i
    return distances[best]
  }
  const candidates = line.stations.map(id => stationById.get(id)!).filter(s => !s.terminal)
  // Prefer an interchange near the city centre so the opening has surrounding urban context.
  const featured = candidates.filter(s => s.interchange).sort((a, b) => Math.hypot(a.lng - 104.92, a.lat - 11.56) - Math.hypot(b.lng - 104.92, b.lat - 11.56))[0] ?? candidates[Math.floor(candidates.length / 2)]
  const focus: LngLat = [featured.lng, featured.lat]
  const d = nearest(focus)
  const a = pr.fwd(at(d - 250)), b = pr.fwd(at(d + 250))
  const heading = Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI
  const reveal = line.riverCrossings[0]?.at ?? at(d + 1600)
  const frames: TourFrame[] = [
    { time: 0, center: at(d - 700), zoom: 15.2, pitch: 48, bearing: heading - 55 },
    { time: 4, center: at(d - 400), zoom: 16.5, pitch: 62, bearing: heading - 35 },
    { time: 10, center: focus, zoom: 16.6, pitch: 60, bearing: heading + 25 },
    { time: 15, center: focus, zoom: 16.4, pitch: 58, bearing: heading + 115 },
    { time: 20, center: reveal, zoom: 14.8, pitch: 50, bearing: heading + 155 },
    { time: 25, center: reveal, zoom: 16, pitch: 60, bearing: heading + 205 },
    { time: 32, center: at(total / 2), zoom: Math.min(13, 15 - Math.log2(total / 1600)), pitch: 45, bearing: heading + 240 },
  ]
  for (let i = 1; i < frames.length; i++) frames[i].bearing = turn(frames[i - 1].bearing, frames[i].bearing)
  return frames
}

/** Smoothstep gives each shot a gentle arrival and departure, independent of frame rate. */
export function sampleTour(frames: TourFrame[], seconds: number): Omit<TourFrame, 'time'> {
  const t = Math.max(0, Math.min(frames.at(-1)!.time, seconds))
  const i = Math.max(1, frames.findIndex(f => f.time >= t))
  const a = frames[i - 1], b = frames[i]
  const u = (t - a.time) / (b.time - a.time)
  const k = u * u * (3 - 2 * u)
  return { center: [mix(a.center[0], b.center[0], k), mix(a.center[1], b.center[1], k)], zoom: mix(a.zoom, b.zoom, k), pitch: mix(a.pitch, b.pitch, k), bearing: mix(a.bearing, b.bearing, k) }
}
