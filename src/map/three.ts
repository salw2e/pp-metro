import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl'
import { lines, stations, stationById } from '../data/network'
import { projector, resample, lineLength, type LngLat } from '../lib/geo'

// 3D presentation: elevated sections as viaducts on piers, stations as volumes, softer buildings, light and sky.
// Heights are illustrative (deck about 9 to 11 m above the road), not design values.

const DECK_BASE = 9
const DECK_TOP = 11
const HALF_WIDTH = 5 // m, double-track deck

/** Offsets a polyline sideways by +-half metres and returns the strip as a polygon ring. */
function strip(coords: LngLat[], half: number): LngLat[] {
  const pr = projector(coords[0][1])
  const P = coords.map(pr.fwd)
  const left: [number, number][] = []
  const right: [number, number][] = []
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)]
    const b = P[Math.min(P.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    left.push([P[i][0] + nx * half, P[i][1] + ny * half])
    right.push([P[i][0] - nx * half, P[i][1] - ny * half])
  }
  const ring = [...left, ...right.reverse()]
  ring.push(ring[0])
  return ring.map(pr.inv)
}

/** A rectangle of the given length and width centred on p, aligned with the direction dir (radians). */
function box(p: LngLat, dir: number, length: number, width: number): LngLat[] {
  const pr = projector(p[1])
  const [cx, cy] = pr.fwd(p)
  const ux = Math.cos(dir)
  const uy = Math.sin(dir)
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([s, t]) => [
    cx + ux * (s * length) / 2 - uy * (t * width) / 2,
    cy + uy * (s * length) / 2 + ux * (t * width) / 2,
  ])
  return corners.map(pr.inv)
}

/** Direction of a line at the point nearest p, in projected radians. */
function directionAt(coords: LngLat[], p: LngLat) {
  const pr = projector(p[1])
  let best = 0
  let bd = Infinity
  for (let i = 1; i < coords.length; i++) {
    // segments share their end points, which gives zero-length steps with no direction
    if (coords[i][0] === coords[i - 1][0] && coords[i][1] === coords[i - 1][1]) continue
    const m: LngLat = [(coords[i][0] + coords[i - 1][0]) / 2, (coords[i][1] + coords[i - 1][1]) / 2]
    const d = Math.hypot(m[0] - p[0], m[1] - p[1])
    if (d < bd) { bd = d; best = i }
  }
  const a = pr.fwd(coords[best - 1])
  const b = pr.fwd(coords[best])
  return Math.atan2(b[1] - a[1], b[0] - a[0])
}

const poly = (ring: LngLat[], props: Record<string, unknown>): GeoJSON.Feature => ({ type: 'Feature', properties: props, geometry: { type: 'Polygon', coordinates: [ring] } })

let cached: { deck: GeoJSON.FeatureCollection; piers: GeoJSON.FeatureCollection; stationBoxes: GeoJSON.FeatureCollection } | null = null

function build() {
  if (cached) return cached
  const deck: GeoJSON.Feature[] = []
  const piers: GeoJSON.Feature[] = []
  for (const l of lines) for (const s of l.segments) {
    if (s.type !== 'elevated') continue
    const pts = resample(s.coords, 12)
    // short pieces keep the extrusion triangulation simple and let tiles clip cleanly
    for (let i = 0; i < pts.length - 1; i += 16) {
      const piece = pts.slice(i, Math.min(pts.length, i + 17))
      if (piece.length > 1) {
        deck.push(poly(strip(piece, HALF_WIDTH), { part: 'deck', color: '#cdd3db', base: DECK_BASE, top: DECK_TOP }))
        deck.push(poly(strip(piece, 2.6), { part: 'track', color: l.color, base: DECK_TOP, top: DECK_TOP + 0.7 }))
      }
    }
    const pierPts = resample(s.coords, 36)
    for (let i = 1; i < pierPts.length - 1; i++) {
      const dir = directionAt(s.coords, pierPts[i])
      piers.push(poly(box(pierPts[i], dir, 2.2, 3.2), { line: l.id }))
    }
  }
  const boxes: GeoJSON.Feature[] = []
  for (const st of stations) {
    st.lines.forEach((lid, k) => {
      const line = lines.find(x => x.id === lid)!
      const coords = line.segments.flatMap(s => s.coords)
      const dir = directionAt(coords, [st.lng, st.lat])
      const type = st.types[k]
      const p: LngLat = [st.lng, st.lat]
      if (type === 'elevated') {
        boxes.push(poly(box(p, dir, 140, 24), { part: 'body', color: '#d3dce6', base: 6, top: DECK_TOP + 6, line: lid }))
        boxes.push(poly(box(p, dir, 148, 28), { part: 'roof', color: '#f6f7f9', base: DECK_TOP + 6, top: DECK_TOP + 7.2, line: lid }))
        boxes.push(poly(box(p, dir, 148, 5), { part: 'stripe', color: line.color, base: DECK_TOP + 7.2, top: DECK_TOP + 7.6, line: lid }))
      } else if (type === 'underground') {
        // entrance pavilions on both sides of the street
        const off = 16
        const pr = projector(p[1])
        const [x, y] = pr.fwd(p)
        for (const s of [-1, 1]) {
          const q = pr.inv([x - Math.sin(dir) * off * s + Math.cos(dir) * 30 * s, y + Math.cos(dir) * off * s + Math.sin(dir) * 30 * s])
          boxes.push(poly(box(q, dir, 14, 7), { part: 'entrance', color: line.color, base: 0, top: 4.5, line: lid }))
        }
      } else {
        boxes.push(poly(box(p, dir, 120, 14), { part: 'canopy', color: '#eef1f5', base: 3.2, top: 4.6, line: lid }))
      }
    })
  }
  cached = {
    deck: { type: 'FeatureCollection', features: deck },
    piers: { type: 'FeatureCollection', features: piers },
    stationBoxes: { type: 'FeatureCollection', features: boxes },
  }
  return cached
}

/** Adds the 3D layers (hidden until the camera is tilted). Call after addOverlay on every style load. */
export function add3D(map: MLMap) {
  const d = build()
  const set = (id: string, data: GeoJSON.FeatureCollection) => {
    const s = map.getSource(id) as GeoJSONSource | undefined
    if (s) s.setData(data)
    else map.addSource(id, { type: 'geojson', data })
  }
  set('viaduct', d.deck)
  set('piers', d.piers)
  set('station-3d', d.stationBoxes)
  const before = map.getLayer('lm-dot') ? 'lm-dot' : map.getLayer('depot-icon') ? 'depot-icon' : undefined
  map.addLayer({
    id: 'piers-3d', type: 'fill-extrusion', source: 'piers', minzoom: 13, layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': '#9aa3ae', 'fill-extrusion-base': 0, 'fill-extrusion-height': DECK_BASE, 'fill-extrusion-opacity': 0.95 },
  }, before)
  map.addLayer({
    id: 'viaduct-3d', type: 'fill-extrusion', source: 'viaduct', layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'top'], 'fill-extrusion-opacity': 0.97, 'fill-extrusion-vertical-gradient': true },
  }, before)
  map.addLayer({
    id: 'station-3d', type: 'fill-extrusion', source: 'station-3d', minzoom: 12, layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'top'], 'fill-extrusion-opacity': 0.95, 'fill-extrusion-vertical-gradient': true },
  }, before)
  // buildings are drawn above roads and ground lines (so a building hides a line behind it instead of the line
  // cutting through it) and below the viaducts and station volumes
  if (map.getLayer('building-3d')) map.moveLayer('building-3d', 'piers-3d')
}

let saved: Record<string, unknown> | null = null

/** Switches the 3D presentation on or off; called when the pitch crosses 20 degrees and after style loads. */
export function set3D(map: MLMap, on: boolean) {
  const vis = on ? 'visible' : 'none'
  for (const id of ['viaduct-3d', 'piers-3d', 'station-3d', 'building-3d']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
  // the flat elevated line would show under the viaduct, so it is hidden while the viaduct is drawn
  for (const id of ['net-casing', 'net-line', 'net-elevated-core']) {
    if (!map.getLayer(id)) continue
    const base = id === 'net-elevated-core' ? ['==', ['get', 'type'], 'elevated'] : null
    map.setFilter(id, on ? (base ? ['==', 1, 0] : ['!=', ['get', 'type'], 'elevated']) : (base as never))
  }
  if (map.getLayer('building-3d')) {
    if (!saved) saved = { color: map.getPaintProperty('building-3d', 'fill-extrusion-color'), opacity: map.getPaintProperty('building-3d', 'fill-extrusion-opacity') }
    map.setPaintProperty('building-3d', 'fill-extrusion-color', ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, '#e9ecf0', 30, '#d9dee5', 90, '#c6cdd7', 200, '#b3bcc8'])
    map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.88)
    map.setPaintProperty('building-3d', 'fill-extrusion-vertical-gradient', true)
  }
  // base-map icons and minor labels compete with the network in an oblique view
  for (const l of map.getStyle().layers) {
    if (l.type === 'symbol' && /^(poi|highway-shield|road_shield|airport)/.test(l.id)) map.setLayoutProperty(l.id, 'visibility', on ? 'none' : 'visible')
  }
  if (on) {
    map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.42, position: [1.3, 210, 35] })
    map.setSky({
      'sky-color': '#a9c6e6', 'horizon-color': '#eaf0f6', 'fog-color': '#eef2f7',
      'sky-horizon-blend': 0.55, 'horizon-fog-blend': 0.75, 'fog-ground-blend': 0.35, 'atmosphere-blend': 0,
    })
  }
}

/** Smooth camera flight along a line, or an orbit around a station, for presentations. Returns a stop function. */
export function startTour(map: MLMap, target: { line?: string; station?: string }, onEnd: () => void) {
  let raf = 0
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    for (const ev of ['mousedown', 'touchstart', 'wheel'] as const) map.getCanvas().removeEventListener(ev, stop)
    onEnd()
  }
  for (const ev of ['mousedown', 'touchstart', 'wheel'] as const) map.getCanvas().addEventListener(ev, stop, { passive: true })

  if (target.station) {
    const s = stationById.get(target.station)!
    const start = performance.now()
    const b0 = map.getBearing()
    const tick = (t: number) => {
      if (stopped) return
      const k = (t - start) / 1000
      map.jumpTo({ center: [s.lng, s.lat], zoom: 16.4, pitch: 62, bearing: b0 + k * 9 })
      if (k > 40) return stop()
      raf = requestAnimationFrame(tick)
    }
    map.easeTo({ center: [s.lng, s.lat], zoom: 16.4, pitch: 62, duration: 1500 })
    map.once('moveend', () => { if (!stopped) raf = requestAnimationFrame(tick) })
    return stop
  }

  const line = lines.find(l => l.id === (target.line ?? 'L1'))!
  const path = resample(line.segments.flatMap(s => s.coords), 20)
  const total = lineLength(path)
  // about 45 seconds for any line, never faster than 400 m/s
  const speed = Math.min(400, Math.max(120, total / 45))
  const look = 450 // m ahead: the camera faces where the line is going
  const pr = projector(path[0][1])
  const P = path.map(pr.fwd)
  const cum = [0]
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
  const at = (d: number): [number, number] => {
    d = Math.max(0, Math.min(cum[cum.length - 1], d))
    let i = cum.findIndex(c => c >= d)
    if (i <= 0) i = 1
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1)
    return [P[i - 1][0] + t * (P[i][0] - P[i - 1][0]), P[i - 1][1] + t * (P[i][1] - P[i - 1][1])]
  }
  const bearingAt = (d: number) => {
    const a = at(d - look / 2)
    const b = at(d + look)
    return (Math.atan2(b[0] - a[0], b[1] - a[1]) * 180) / Math.PI
  }
  let bearing = bearingAt(0)
  let last = 0
  let dist = 0
  const first = pr.inv(at(0))
  map.easeTo({ center: first, zoom: 15.7, pitch: 64, bearing, duration: 1800 })
  map.once('moveend', () => {
    if (stopped) return
    last = performance.now()
    const tick = (t: number) => {
      if (stopped) return
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      dist += speed * dt
      if (dist >= total) return stop()
      // ease the bearing so that curves are taken smoothly rather than snapping
      const target = bearingAt(dist)
      let diff = ((target - bearing + 540) % 360) - 180
      bearing += diff * Math.min(1, dt * 1.6)
      map.jumpTo({ center: pr.inv(at(dist)), bearing, pitch: 64, zoom: 15.7 })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  })
  return stop
}
