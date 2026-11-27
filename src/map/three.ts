import { railStrips } from './rail-geometry'
import { buildTour, sampleTour } from './tour'
import type { Map as MLMap, GeoJSONSource, LineLayerSpecification } from 'maplibre-gl'
import { lines, stations } from '../data/network'
import { projector, resample, type LngLat } from '../lib/geo'

// 3D presentation: elevated sections as viaducts on piers, stations as volumes, softer buildings, light and sky.
// Heights are illustrative (deck about 9 to 11 m above the road), not design values.

const DECK_BASE = 9
const DECK_TOP = 11
const HALF_WIDTH = 5 // m, double-track deck

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

const GROUND = ['district-line', 'bridge-line', 'rail-line', 'ext-line', 'river-x', 'net-casing', 'net-line', 'net-elevated-core', 'net-surface-core']
const OWN = new Set(['st-label', 'lm-label', 'depot-label', 'depot-icon', 'district-label'])

let cached: { deck: GeoJSON.FeatureCollection; piers: GeoJSON.FeatureCollection; stationBoxes: GeoJSON.FeatureCollection } | null = null

function build() {
  if (cached) return cached
  const deck: GeoJSON.Feature[] = []
  const piers: GeoJSON.Feature[] = []
  for (const l of lines) {
    const runs: LngLat[][] = []
    let run: LngLat[] | null = null
    for (const segment of l.segments) {
      if (segment.type !== 'elevated') { run = null; continue }
      if (!run) { run = [...segment.coords]; runs.push(run) }
      else run.push(...segment.coords.slice(1))
    }
    for (const coords of runs) {
      const pts = resample(coords, 12)
      for (const ring of railStrips(pts, HALF_WIDTH)) deck.push(poly(ring, { part: 'deck', line: l.id, color: '#cdd3db', base: DECK_BASE, top: DECK_TOP }))
      // Two separate track beds read as railway geometry instead of a solid coloured ribbon.
      for (const offset of [-2, 2]) for (const ring of railStrips(pts, 0.9, offset)) {
        deck.push(poly(ring, { part: 'track', line: l.id, color: '#58636d', base: DECK_TOP, top: DECK_TOP + 0.18 }))
      }
      const pierPts = resample(coords, 36)
      for (let i = 1; i < pierPts.length - 1; i++) piers.push(poly(box(pierPts[i], directionAt(coords, pierPts[i]), 2.2, 3.2), { line: l.id }))
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
  roadPaint.set(map, new Map())
  const d = build()
  const set = (id: string, data: GeoJSON.FeatureCollection) => {
    const s = map.getSource(id) as GeoJSONSource | undefined
    if (s) s.setData(data)
    else map.addSource(id, { type: 'geojson', data })
  }
  set('viaduct', d.deck)
  set('piers', d.piers)
  set('station-3d', d.stationBoxes)
  // draw order: base map shapes, project ground lines, buildings, 3D project volumes, then all text and markers.
  // Text stays above the buildings so it is never cut by them.
  const firstText = map.getStyle().layers.find(l => l.type === 'symbol' && !OWN.has(l.id))?.id
  for (const id of ['transit-veil', ...GROUND]) if (map.getLayer(id) && firstText) map.moveLayer(id, firstText)
  if (map.getLayer('building-3d') && firstText) map.moveLayer('building-3d', firstText)
  const before = firstText
  map.addLayer({
    id: 'piers-3d', type: 'fill-extrusion', source: 'piers', minzoom: 13, layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': '#9aa3ae', 'fill-extrusion-base': 0, 'fill-extrusion-height': DECK_BASE, 'fill-extrusion-opacity': 0.95 },
  }, before)
  map.addLayer({
    id: 'viaduct-3d', type: 'fill-extrusion', source: 'viaduct', layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'top'], 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true },
  }, before)
  map.addLayer({
    id: 'station-3d', type: 'fill-extrusion', source: 'station-3d', minzoom: 12, layout: { visibility: 'none' },
    paint: { 'fill-extrusion-color': ['get', 'color'], 'fill-extrusion-base': ['get', 'base'], 'fill-extrusion-height': ['get', 'top'], 'fill-extrusion-opacity': 0.95, 'fill-extrusion-vertical-gradient': true },
  }, before)

}

type RoadPaint = { color: NonNullable<LineLayerSpecification['paint']>['line-color']; visibility: 'visible' | 'none' | undefined }
const roadPaint = new WeakMap<MLMap, Map<string, RoadPaint>>()

/** Switches the 3D presentation on or off; called when the pitch crosses 20 degrees and after style loads. */
export function set3D(map: MLMap, on: boolean) {
  const originals = roadPaint.get(map) ?? new Map<string, RoadPaint>()
  roadPaint.set(map, originals)
  const vis = on ? 'visible' : 'none'
  for (const id of ['viaduct-3d', 'piers-3d', 'station-3d', 'building-3d']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
  // the flat elevated line would show under the viaduct, so it is hidden while the viaduct is drawn
  for (const id of ['net-casing', 'net-line', 'net-elevated-core']) {
    if (!map.getLayer(id)) continue
    const base = id === 'net-elevated-core' ? ['==', ['get', 'type'], 'elevated'] : null
    map.setFilter(id, on ? (base ? ['==', 1, 0] : ['!=', ['get', 'type'], 'elevated']) : (base as never))
  }
  if (map.getLayer('building-3d')) {
    map.setPaintProperty('building-3d', 'fill-extrusion-color', ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, '#e9ecf0', 30, '#d9dee5', 90, '#c6cdd7', 200, '#b3bcc8'])
    map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.88)
    map.setPaintProperty('building-3d', 'fill-extrusion-vertical-gradient', true)
  }
  // base-map icons and minor labels compete with the network in an oblique view
  for (const l of map.getStyle().layers) {
    if (l.type === 'line' && /^(road|bridge|tunnel)_/.test(l.id) && !/rail/.test(l.id)) {
      if (on && !originals.has(l.id)) originals.set(l.id, { color: map.getPaintProperty(l.id, 'line-color') as RoadPaint['color'], visibility: map.getLayoutProperty(l.id, 'visibility') as RoadPaint['visibility'] })
      const original = originals.get(l.id)
      if (original) {
        map.setPaintProperty(l.id, 'line-color', on ? '#f1f2f3' : original.color)
        map.setLayoutProperty(l.id, 'visibility', on && l.id.endsWith('_casing') ? 'none' : original.visibility ?? 'visible')
      }
    }
    // street names and neighbourhood names are dense and lie flat on the ground, so they clash with buildings
    if (l.type === 'symbol' && /^(poi|highway-shield|road_shield|airport|highway-name|label_other|road_one_way)/.test(l.id)) map.setLayoutProperty(l.id, 'visibility', on ? 'none' : 'visible')
  }
  if (on) {
    map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.42, position: [1.3, 210, 35] })
    map.setSky({
      'sky-color': '#a9c6e6', 'horizon-color': '#eaf0f6', 'fog-color': '#eef2f7',
      'sky-horizon-blend': 0.55, 'horizon-fog-blend': 0.75, 'fog-ground-blend': 0.35, 'atmosphere-blend': 0,
    })
  }
}

/** Directed camera sequence; dragging, scrolling or changing the style returns control immediately. */
export function startTour(map: MLMap, target: { line?: string; station?: string }, onEnd: () => void) {
  const frames = buildTour(target)
  let raf = 0
  let stopped = false
  let elapsed = 0
  let last = 0
  const canvas = map.getContainer()
  const page = canvas.ownerDocument
  const resetClock = () => { last = performance.now() }
  const stop = () => {
    if (stopped) return
    stopped = true
    cancelAnimationFrame(raf)
    page?.removeEventListener('visibilitychange', resetClock)
    map.off('moveend', begin)
    map.off('style.load', stop)
    map.stop()
    for (const ev of ['mousedown', 'touchstart', 'wheel', 'keydown'] as const) canvas.removeEventListener(ev, stop)
    onEnd()
  }
  const tick = (now: number) => {
    if (stopped) return
    // Keep real-time pacing on slow devices; hidden tabs pause instead of skipping shots.
    if (!page?.hidden) elapsed += (now - last) / 1000
    last = now
    map.jumpTo(sampleTour(frames, elapsed))
    if (elapsed >= frames.at(-1)!.time) { stop(); return }
    raf = requestAnimationFrame(tick)
  }
  const begin = () => {
    if (stopped) return
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
  map.stop()
  for (const ev of ['mousedown', 'touchstart', 'wheel', 'keydown'] as const) canvas.addEventListener(ev, stop, { passive: true })
  page?.addEventListener('visibilitychange', resetClock)
  map.on('style.load', stop)
  map.once('moveend', begin)
  map.easeTo({ ...sampleTour(frames, 0), duration: 1200 })
  return stop
}
