import type { Map as MLMap, ExpressionSpecification, FilterSpecification, GeoJSONSource } from 'maplibre-gl'
import { lines, stations, extensions, depots } from '../data/network'
import type { Lang } from '../i18n'
import { haversine } from '../lib/geo'

export type LayerKey = 'network' | 'stations' | 'labels' | 'extensions' | 'depots' | 'rivers' | 'railway' | 'districts' | 'landmarks' | 'bridges'

export const LAYER_GROUPS: Record<LayerKey, string[]> = {
  network: ['net-casing', 'net-line', 'net-elevated-core', 'net-surface-core'],
  stations: ['st-ring', 'st-circle', 'st-selected'],
  labels: ['st-label'],
  extensions: ['ext-line'],
  depots: ['depot-icon', 'depot-label'],
  rivers: ['river-x'],
  railway: ['rail-line'],
  districts: ['district-line', 'district-label'],
  landmarks: ['lm-dot', 'lm-label'],
  bridges: ['bridge-line'],
}

export const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  network: true, stations: true, labels: true, extensions: true, depots: true, rivers: true,
  railway: true, districts: false, landmarks: false, bridges: false,
}

const BASE = import.meta.env.BASE_URL
const cache = new Map<string, Promise<GeoJSON.FeatureCollection>>()
export const loadData = (name: string) => {
  if (!cache.has(name)) cache.set(name, fetch(`${BASE}data/${name}.geojson`).then(r => {
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`)
    return r.json()
  }))
  return cache.get(name)!
}

export function networkGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const l of lines) for (const s of l.segments) {
    features.push({
      type: 'Feature',
      properties: { kind: 'segment', line: l.id, lineName: l.en, color: l.color, type: s.type, from: s.from, to: s.to, lengthM: s.lengthM, note: s.note ?? '' },
      geometry: { type: 'LineString', coordinates: s.coords },
    })
  }
  return { type: 'FeatureCollection', features }
}

export function stationsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stations.map(s => {
      const first = lines.find(l => l.id === s.lines[0])!
      return {
        type: 'Feature',
        id: stations.indexOf(s),
        properties: {
          kind: 'station', id: s.id, en: s.en, km: s.km, color: first.color, lines: s.lines.join(','), codes: s.codes.join(' / '),
          interchange: s.interchange, terminal: s.terminal, rank: s.interchange ? 0 : s.terminal ? 1 : 2,
        },
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      }
    }),
  }
}

export function extensionsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: extensions.map(x => ({
      type: 'Feature',
      properties: { kind: 'extension', id: x.id, line: x.line, en: x.en, km: x.km, color: lines.find(l => l.id === x.line)!.color, lengthM: x.lengthM },
      geometry: { type: 'LineString', coordinates: x.coords },
    })),
  }
}

export function depotsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: depots.map(d => ({ type: 'Feature', properties: { kind: 'depot', en: d.en, km: d.km, lines: d.lines.join(','), note: d.note }, geometry: { type: 'Point', coordinates: d.at } })),
  }
}

export function crossingsGeoJSON(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: lines.flatMap(l => l.riverCrossings.map(c => ({
      type: 'Feature' as const,
      properties: { kind: 'river', line: l.id, river: c.river, lengthM: c.lengthM, type: c.segmentType ?? '' },
      geometry: { type: 'LineString' as const, coordinates: c.coords },
    }))),
  }
}

const LANDMARK_KINDS = new Set(['university', 'hospital', 'mall', 'attraction', 'museum', 'monument', 'memorial', 'stadium', 'aerodrome', 'station', 'palace'])

function landmarkKind(p: Record<string, string>) {
  return p.aeroway === 'aerodrome' ? 'aerodrome' : p.railway === 'station' ? 'station' : p.amenity === 'university' ? 'university'
    : p.amenity === 'hospital' ? 'hospital' : p.shop === 'mall' ? 'mall' : p.leisure === 'stadium' ? 'stadium' : p.building === 'palace' ? 'palace'
      : p.tourism === 'museum' ? 'museum' : p.tourism === 'attraction' ? 'attraction' : p.historic ? p.historic : p.amenity === 'marketplace' ? 'market' : ''
}

export async function landmarksGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const fc = await loadData('places')
  return {
    type: 'FeatureCollection',
    features: fc.features
      .map(f => ({ f, k: landmarkKind(f.properties as Record<string, string>) }))
      // markets are numerous in OpenStreetMap; only the large named ones (Phsar ...) are shown
      .filter(({ f, k }) => LANDMARK_KINDS.has(k) || (k === 'market' && /^(Central|Phsar|Olympic)/.test(String(f.properties!['name:en'] ?? f.properties!.name ?? ''))))
      .map(({ f, k }) => ({
        type: 'Feature' as const,
        properties: {
          kind: 'landmark', category: k,
          en: String(f.properties!['name:en'] ?? f.properties!.name ?? ''),
          km: String(f.properties!['name:km'] ?? (/[ក-៿]/.test(String(f.properties!.name ?? '')) ? f.properties!.name : f.properties!['name:en'] ?? f.properties!.name ?? '')),
          rank: ['aerodrome', 'station', 'palace', 'stadium', 'university'].includes(k) ? 0 : k === 'hospital' || k === 'mall' ? 1 : 2,
        },
        geometry: f.geometry,
      }))
      .filter(f => f.properties.en),
  }
}

/** A label point inside each district: the vertex-average of its largest ring, pulled to the ring if it falls outside. */
export async function districtsData() {
  const fc = await loadData('districts')
  const labels: GeoJSON.Feature[] = fc.features.map(f => {
    const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
    const rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.coordinates.map(p => p[0])
    const ring = rings.sort((a, b) => b.length - a.length)[0]
    const c = ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length], [0, 0])
    const p = f.properties as Record<string, string>
    return {
      type: 'Feature',
      properties: { kind: 'district', en: String(p['name:en'] ?? '').replace(/^Khan /, ''), km: p.name },
      geometry: { type: 'Point', coordinates: c },
    }
  })
  return { polygons: fc, labels: { type: 'FeatureCollection', features: labels } as GeoJSON.FeatureCollection }
}

export async function bridgesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  const fc = await loadData('bridges')
  // keep the long named bridges, which are the river crossings; short bridges over drains are noise at city scale
  return {
    type: 'FeatureCollection',
    features: fc.features.filter(f => {
      if (f.geometry.type !== 'LineString') return false
      const c = f.geometry.coordinates as [number, number][]
      let len = 0
      for (let i = 1; i < c.length; i++) len += haversine(c[i - 1], c[i])
      return len > 250
    }),
  }
}

const nameExpr = (lang: Lang): ExpressionSpecification => (lang === 'km' ? ['coalesce', ['get', 'km'], ['get', 'en']] : ['get', 'en'])

export interface OverlayState {
  lang: Lang
  layers: Record<LayerKey, boolean>
  focusLine: string | null
  selected: string | null
  transit: boolean
}

/** Adds every project source and layer to the current style. Called after each style load. */
export async function addOverlay(map: MLMap, st: OverlayState) {
  const [lm, dist, bridges, rail] = await Promise.all([
    landmarksGeoJSON().catch(() => null),
    districtsData().catch(() => null),
    bridgesGeoJSON().catch(() => null),
    loadData('railways').catch(() => null),
  ])
  if (!map.getStyle()) return

  const add = (id: string, data: GeoJSON.FeatureCollection) => {
    if (map.getSource(id)) (map.getSource(id) as GeoJSONSource).setData(data)
    else map.addSource(id, { type: 'geojson', data })
  }
  add('network', networkGeoJSON())
  add('stations', stationsGeoJSON())
  add('extensions', extensionsGeoJSON())
  add('depots', depotsGeoJSON())
  add('crossings', crossingsGeoJSON())
  if (lm) add('landmarks', lm)
  if (dist) { add('districts', dist.polygons); add('district-labels', dist.labels) }
  if (bridges) add('bridges', bridges)
  if (rail) add('railway', { type: 'FeatureCollection', features: rail.features.filter(f => (f.properties as Record<string, string>).railway === 'rail') })

  if (st.transit) {
    // simplified transit view: wash out the base map so that the network reads first
    map.addLayer({ id: 'transit-veil', type: 'background', paint: { 'background-color': '#ffffff', 'background-opacity': 0.55 } })
    for (const l of map.getStyle().layers) {
      if (l.type === 'symbol' && !/^(place_|label_city|label_town|label_village|water_name)/.test(l.id) && l.id !== 'transit-veil') map.setLayoutProperty(l.id, 'visibility', 'none')
    }
  }

  const lineOpacity: ExpressionSpecification = ['case', ['any', ['!', ['to-boolean', st.focusLine ?? '']], ['==', ['get', 'line'], st.focusLine ?? '']], 1, 0.2]
  const z = (a: number, b: number, c: number): ExpressionSpecification => ['interpolate', ['linear'], ['zoom'], 10, a, 13, b, 16, c]

  if (dist) {
    map.addLayer({ id: 'district-line', type: 'line', source: 'districts', paint: { 'line-color': '#5d6877', 'line-width': 1.2, 'line-dasharray': [3, 2], 'line-opacity': 0.8 } })
    map.addLayer({
      id: 'district-label', type: 'symbol', source: 'district-labels', minzoom: 10.5,
      layout: { 'icon-image': ['concat', 'lbl|district|', nameExpr(st.lang)], 'icon-allow-overlap': false, 'icon-padding': 4 },
    })
  }
  if (bridges) map.addLayer({ id: 'bridge-line', type: 'line', source: 'bridges', paint: { 'line-color': '#3b4552', 'line-width': z(3, 5, 9), 'line-opacity': 0.75 } })
  if (rail) map.addLayer({ id: 'rail-line', type: 'line', source: 'railway', paint: { 'line-color': '#7a6a8f', 'line-width': z(1.5, 2, 3), 'line-dasharray': [4, 2] } })

  map.addLayer({
    id: 'ext-line', type: 'line', source: 'extensions',
    layout: { 'line-cap': 'butt' },
    paint: { 'line-color': ['get', 'color'], 'line-width': z(2.5, 3.5, 5), 'line-dasharray': [2, 1.5], 'line-opacity': st.focusLine ? 0.2 : 0.85 },
  })
  map.addLayer({ id: 'river-x', type: 'line', source: 'crossings', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#2f7fd1', 'line-width': z(10, 14, 22), 'line-opacity': 0.35 } })
  map.addLayer({ id: 'net-casing', type: 'line', source: 'network', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': z(6, 9, 14), 'line-opacity': lineOpacity } })
  map.addLayer({ id: 'net-line', type: 'line', source: 'network', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': ['get', 'color'], 'line-width': z(3.5, 6, 10), 'line-opacity': lineOpacity } })
  // elevated: a white core line; surface: a dashed white core
  map.addLayer({
    id: 'net-elevated-core', type: 'line', source: 'network', filter: ['==', ['get', 'type'], 'elevated'] as FilterSpecification,
    layout: { 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': z(1, 2, 3.5), 'line-opacity': lineOpacity },
  })
  map.addLayer({
    id: 'net-surface-core', type: 'line', source: 'network', filter: ['==', ['get', 'type'], 'surface'] as FilterSpecification,
    paint: { 'line-color': '#ffffff', 'line-width': z(1, 2, 3.5), 'line-dasharray': [2, 2], 'line-opacity': lineOpacity },
  })

  if (lm) {
    map.addLayer({
      id: 'lm-dot', type: 'circle', source: 'landmarks', minzoom: 12,
      paint: { 'circle-radius': 3, 'circle-color': '#5d6877', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1 },
    })
    map.addLayer({
      id: 'lm-label', type: 'symbol', source: 'landmarks', minzoom: 13.5,
      layout: {
        'icon-image': ['concat', 'lbl|landmark|', nameExpr(st.lang)], 'icon-anchor': 'left', 'icon-offset': [5, 0],
        'symbol-sort-key': ['get', 'rank'], 'icon-padding': 2,
      },
    })
  }

  map.addLayer({
    id: 'depot-icon', type: 'symbol', source: 'depots',
    layout: { 'icon-image': 'depot', 'icon-allow-overlap': true, 'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 14, 1.1] },
  })
  map.addLayer({
    id: 'depot-label', type: 'symbol', source: 'depots', minzoom: 12.5,
    layout: { 'icon-image': ['concat', 'lbl|landmark|', nameExpr(st.lang)], 'icon-anchor': 'left', 'icon-offset': [12, 0] },
  })

  const radius = (base: number): ExpressionSpecification => ['interpolate', ['linear'], ['zoom'], 10, base * 0.65, 13, base, 16, base * 1.5]
  const stOpacity: ExpressionSpecification = st.focusLine ? ['case', ['in', st.focusLine, ['get', 'lines']], 1, 0.25] : ['literal', 1]
  map.addLayer({
    id: 'st-selected', type: 'circle', source: 'stations', filter: ['==', ['get', 'id'], st.selected ?? ''] as FilterSpecification,
    paint: { 'circle-radius': radius(14), 'circle-color': '#12284a', 'circle-opacity': 0.18, 'circle-stroke-color': '#12284a', 'circle-stroke-width': 2 },
  })
  map.addLayer({
    id: 'st-ring', type: 'circle', source: 'stations', filter: ['==', ['get', 'interchange'], true] as FilterSpecification,
    paint: { 'circle-radius': radius(7.5), 'circle-color': '#ffffff', 'circle-stroke-color': '#1b2430', 'circle-stroke-width': 3, 'circle-opacity': stOpacity, 'circle-stroke-opacity': stOpacity },
  })
  map.addLayer({
    id: 'st-circle', type: 'circle', source: 'stations', filter: ['==', ['get', 'interchange'], false] as FilterSpecification,
    paint: {
      'circle-radius': radius(5),
      'circle-color': ['case', ['get', 'terminal'], ['get', 'color'], '#ffffff'],
      'circle-stroke-color': ['case', ['get', 'terminal'], '#ffffff', ['get', 'color']],
      'circle-stroke-width': ['case', ['get', 'terminal'], 2, 2.5],
      'circle-opacity': stOpacity,
      'circle-stroke-opacity': stOpacity,
    },
  })
  map.addLayer({
    id: 'st-label', type: 'symbol', source: 'stations',
    layout: {
      'icon-image': ['concat', ['case', ['<', ['get', 'rank'], 2], 'lbl|major|', 'lbl|station|'], nameExpr(st.lang)],
      'icon-anchor': 'left',
      'icon-offset': [9, 0],
      'symbol-sort-key': ['get', 'rank'],
      'icon-padding': 3,
      'icon-allow-overlap': false,
      'icon-ignore-placement': false,
    },
    paint: { 'icon-opacity': stOpacity },
  })

  applyVisibility(map, st.layers)
}

export function applyVisibility(map: MLMap, layers: Record<LayerKey, boolean>) {
  for (const [k, ids] of Object.entries(LAYER_GROUPS) as [LayerKey, string[]][]) {
    for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', layers[k] ? 'visible' : 'none')
  }
}


/** Dims every line except the focused one. */
export function setFocus(map: MLMap, line: string | null) {
  const op: ExpressionSpecification = ['case', ['any', ['!', ['to-boolean', line ?? '']], ['==', ['get', 'line'], line ?? '']], 1, 0.2]
  for (const id of ['net-casing', 'net-line', 'net-elevated-core', 'net-surface-core']) if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', op)
  if (map.getLayer('ext-line')) map.setPaintProperty('ext-line', 'line-opacity', line ? ['case', ['==', ['get', 'line'], line], 0.85, 0.15] : 0.85)
  const sop: ExpressionSpecification = line ? ['case', ['in', line, ['get', 'lines']], 1, 0.25] : ['literal', 1]
  for (const id of ['st-ring', 'st-circle']) if (map.getLayer(id)) { map.setPaintProperty(id, 'circle-opacity', sop); map.setPaintProperty(id, 'circle-stroke-opacity', sop) }
  if (map.getLayer('st-label')) map.setPaintProperty('st-label', 'icon-opacity', sop)
}

export function setSelected(map: MLMap, id: string | null) {
  if (map.getLayer('st-selected')) map.setFilter('st-selected', ['==', ['get', 'id'], id ?? ''])
}

export function setLang(map: MLMap, lang: Lang) {
  const n = nameExpr(lang)
  if (map.getLayer('st-label')) map.setLayoutProperty('st-label', 'icon-image', ['concat', ['case', ['<', ['get', 'rank'], 2], 'lbl|major|', 'lbl|station|'], n])
  if (map.getLayer('lm-label')) map.setLayoutProperty('lm-label', 'icon-image', ['concat', 'lbl|landmark|', n])
  if (map.getLayer('depot-label')) map.setLayoutProperty('depot-label', 'icon-image', ['concat', 'lbl|landmark|', n])
  if (map.getLayer('district-label')) map.setLayoutProperty('district-label', 'icon-image', ['concat', 'lbl|district|', n])
}
