import raw from './network.json'

export type Construction = 'underground' | 'elevated' | 'surface'
export type LngLat = [number, number]

export interface Landmark { en: string; km: string | null; kind: string; distanceM: number; osm: string }

export interface Station {
  id: string
  en: string
  km: string
  lat: number
  lng: number
  snapM: number
  lines: string[]
  codes: string[]
  types: Construction[]
  interchange: boolean
  terminal: boolean
  district: { en: string; km: string; pop2019: number | null; nisCode: string | null } | null
  neighbourhoods: string[]
  landmarks: Landmark[]
  transport: Landmark[]
  flags: { nearRiver: boolean; heritage: boolean; platformOnCurve: string[] }
  why: string
}

export interface Segment { from: string; to: string; type: Construction; note: string | null; lengthM: number; coords: LngLat[] }

export interface Line {
  id: string
  code: string
  en: string
  km: string
  color: string
  summary: string
  phase: string
  stations: string[]
  segments: Segment[]
  lengthM: number
  byType: Record<Construction, number>
  stationSpacingM: { min: number; max: number; mean: number }
  curves: { designRadiusM: number; minRadiusM: number; belowTarget: number; measuredMinRadiusM: number } | null
  riverCrossings: { river: string; riverKm: string; lengthM: number; at: LngLat; coords: LngLat[]; segmentType: Construction | null; between: [string, string] | null }[]
  depot: { en: string; km: string; at: LngLat; note: string }
}

export interface Extension {
  id: string
  line: string
  en: string
  km: string
  from: string
  to: LngLat
  toEn: string
  toKm: string
  why: string
  coords: LngLat[]
  lengthM: number
}

export interface Network {
  generated: string
  status: string
  sources: string[]
  lines: Line[]
  stations: Station[]
  extensions: Extension[]
}

export const network = raw as unknown as Network
export const lines = network.lines
export const stations = network.stations
export const extensions = network.extensions
export const lineById = new Map(lines.map(l => [l.id, l]))
export const stationById = new Map(stations.map(s => [s.id, s]))

/** Physical depots: lines that share a depot site point to the same coordinates. */
export const depots = (() => {
  const seen = new Map<string, { en: string; km: string; at: LngLat; note: string; lines: string[] }>()
  for (const l of lines) {
    const k = l.depot.at.join(',')
    if (!seen.has(k)) seen.set(k, { ...l.depot, lines: [] })
    seen.get(k)!.lines.push(l.id)
  }
  return [...seen.values()]
})()

export const km = (m: number, digits = 1) => (m / 1000).toFixed(digits)

/** Totals for the new-build metro lines (excludes the existing-railway commuter line). */
export function metroTotals(ids = lines.filter(l => l.id !== 'L5').map(l => l.id)) {
  const sel = lines.filter(l => ids.includes(l.id))
  const t = { underground: 0, elevated: 0, surface: 0, length: 0 }
  for (const l of sel) {
    t.underground += l.byType.underground
    t.elevated += l.byType.elevated
    t.surface += l.byType.surface
    t.length += l.lengthM
  }
  // stations are counted once even when several lines meet there
  const st = stations.filter(s => s.lines.some(x => ids.includes(x)))
  const typeOf = (s: Station) => {
    const types = s.lines.map((x, i) => (ids.includes(x) ? s.types[i] : null)).filter(Boolean) as Construction[]
    return types.includes('underground') ? 'underground' : types.includes('elevated') ? 'elevated' : 'surface'
  }
  return {
    ...t,
    stations: st.length,
    stationsByType: {
      underground: st.filter(s => typeOf(s) === 'underground').length,
      elevated: st.filter(s => typeOf(s) === 'elevated').length,
      surface: st.filter(s => typeOf(s) === 'surface').length,
    },
    interchanges: st.filter(s => s.lines.filter(x => ids.includes(x)).length > 1).length,
    depots: new Set(sel.map(l => l.depot.at.join(','))).size,
  }
}

export function lineBounds(ids: string[]): [LngLat, LngLat] {
  let minX = 180, minY = 90, maxX = -180, maxY = -90
  for (const l of lines.filter(l => ids.includes(l.id))) for (const s of l.segments) for (const [x, y] of s.coords) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
  }
  return [[minX, minY], [maxX, maxY]]
}
