import { lines, metroTotals } from '../data/network'
import { computeCost, PRESETS, type CostInputs, type Scenario } from './cost'

export const METRO_IDS = lines.filter(l => l.id !== 'L5').map(l => l.id)
const rail = lines.find(l => l.id === 'L5')!

export function defaultInputs(s: Scenario, ids = METRO_IDS): CostInputs {
  const t = metroTotals(ids)
  return {
    undergroundKm: +(t.underground / 1000).toFixed(2),
    elevatedKm: +(t.elevated / 1000).toFixed(2),
    surfaceKm: +(t.surface / 1000).toFixed(2),
    stationsUnderground: t.stationsByType.underground,
    stationsElevated: t.stationsByType.elevated,
    stationsSurface: t.stationsByType.surface,
    interchanges: t.interchanges,
    depots: t.depots,
    routeKm: +(t.length / 1000).toFixed(2),
    lines: ids.length,
    speedKmh: 35,
    turnaroundMin: 5,
    sparePct: 10,
    baseYear: 2026,
    midYear: 2036,
    includeRailUpgrade: true,
    railKm: +(rail.lengthM / 1000).toFixed(2),
    railStations: rail.stations.length,
    railTrains: 6,
    ridersPerDay: 0,
    fare: 0.5,
    ...(PRESETS[s] as Partial<CostInputs>),
  } as CostInputs
}

export const lineLengthsKm = (ids = METRO_IDS) => lines.filter(l => ids.includes(l.id)).map(l => l.lengthM / 1000)

export const scenarioTotals = () => {
  const r = (s: Scenario) => computeCost(defaultInputs(s), lineLengthsKm())
  return { low: r('low'), base: r('base'), high: r('high') }
}

export const bn = (m: number, d = 1) => (m / 1000).toFixed(d)
