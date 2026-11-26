import { lines, stations, extensions, depots, network } from '../data/network'

export function buildExport() {
  const features: GeoJSON.Feature[] = []
  for (const l of lines) {
    for (const s of l.segments) {
      features.push({
        type: 'Feature',
        properties: { feature: 'segment', line: l.id, line_name: l.en, line_name_km: l.km, from: s.from, to: s.to, construction: s.type, length_m: s.lengthM, note: s.note },
        geometry: { type: 'LineString', coordinates: s.coords },
      })
    }
    for (const c of l.riverCrossings) {
      features.push({ type: 'Feature', properties: { feature: 'river_crossing', line: l.id, river: c.river, construction: c.segmentType, length_over_water_m: c.lengthM }, geometry: { type: 'LineString', coordinates: c.coords } })
    }
  }
  for (const s of stations) {
    features.push({
      type: 'Feature',
      properties: {
        feature: 'station', id: s.id, name_en: s.en, name_km: s.km, codes: s.codes.join(';'), lines: s.lines.join(';'), construction: s.types.join(';'),
        interchange: s.interchange, terminal: s.terminal, district: s.district?.en ?? null, verification: 'desk study, not field-verified',
      },
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
    })
  }
  for (const x of extensions) {
    features.push({ type: 'Feature', properties: { feature: 'future_extension', id: x.id, line: x.line, name_en: x.en, name_km: x.km, length_m: x.lengthM }, geometry: { type: 'LineString', coordinates: x.coords } })
  }
  for (const d of depots) {
    features.push({ type: 'Feature', properties: { feature: 'candidate_depot', name_en: d.en, name_km: d.km, lines: d.lines.join(';'), note: d.note }, geometry: { type: 'Point', coordinates: d.at } })
  }
  return {
    type: 'FeatureCollection',
    name: 'phnom_penh_rail_master_plan_2050_preliminary',
    metadata: {
      status: network.status,
      generated: network.generated,
      crs: 'EPSG:4326 (WGS 84 longitude, latitude)',
      sources: network.sources,
      licence: 'Geometry derived from OpenStreetMap data, ODbL 1.0. Attribution: OpenStreetMap contributors.',
    },
    features,
  }
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function stationsCsv() {
  const head = ['id', 'name_en', 'name_km', 'codes', 'lines', 'construction', 'interchange', 'terminal', 'latitude', 'longitude', 'district', 'district_population_2019', 'verification']
  const rows = stations.map(s => [
    s.id, s.en, s.km, s.codes.join(';'), s.lines.join(';'), s.types.join(';'), s.interchange, s.terminal, s.lat, s.lng,
    s.district?.en ?? 'outside capital', s.district?.pop2019 ?? '', 'desk study, not field-verified',
  ])
  // a byte-order mark lets spreadsheet software read the Khmer names as UTF-8
  return '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
}

export function linesCsv() {
  const head = ['line', 'name_en', 'name_km', 'length_km', 'underground_km', 'elevated_km', 'surface_km', 'stations', 'mean_spacing_m', 'min_curve_radius_m', 'river_crossings', 'phase']
  const rows = lines.map(l => [
    l.id, l.en, l.km, (l.lengthM / 1000).toFixed(2), (l.byType.underground / 1000).toFixed(2), (l.byType.elevated / 1000).toFixed(2), (l.byType.surface / 1000).toFixed(2),
    l.stations.length, l.stationSpacingM.mean, l.curves?.minRadiusM ?? '', l.riverCrossings.map(c => c.river).join(';'), l.phase,
  ])
  return '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
}
