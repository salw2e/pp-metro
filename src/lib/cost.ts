// Preliminary capital and operating cost model. Every default below is an ASSUMPTION for discussion, chosen to sit
// within the range implied by the regional benchmarks on the Financial Assessment page. None is a quotation.

export type Scenario = 'low' | 'base' | 'high'

export interface CostInputs {
  undergroundKm: number
  elevatedKm: number
  surfaceKm: number
  stationsUnderground: number
  stationsElevated: number
  stationsSurface: number
  interchanges: number
  depots: number
  routeKm: number // for fleet sizing; equals the sum of the three lengths unless changed
  lines: number

  ugPerKm: number // US$ million per km: tunnels, track and systems; excludes stations, depots and trains
  elPerKm: number
  sfPerKm: number
  ugStation: number // US$ million per station
  elStation: number
  sfStation: number
  interchangePremiumPct: number // extra share of station cost at interchanges, counted once per station complex
  depotCost: number
  trainCost: number // US$ million per trainset
  speedKmh: number // commercial speed including stops
  headwayMin: number // peak headway
  turnaroundMin: number // per terminal
  sparePct: number
  landPct: number // land and resettlement, % of construction
  engineeringPct: number // design, supervision and project management, % of construction
  contingencyPct: number // % of everything above
  escalationPct: number // annual price escalation
  baseYear: number
  midYear: number // middle of the construction period

  includeRailUpgrade: boolean
  railKm: number
  railPerKm: number
  railStations: number
  railStationCost: number
  railTrains: number
  railTrainCost: number

  opexPerRouteKm: number // US$ million per route-km per year
  ridersPerDay: number
  fare: number // US$ average fare per trip
}

export const PRESETS: Record<Scenario, Partial<CostInputs>> = {
  low: {
    ugPerKm: 100, elPerKm: 25, sfPerKm: 10, ugStation: 80, elStation: 10, sfStation: 3, interchangePremiumPct: 20, depotCost: 60,
    trainCost: 9, headwayMin: 6, landPct: 5, engineeringPct: 8, contingencyPct: 15, escalationPct: 2.5, railPerKm: 2, railStationCost: 2, railTrainCost: 4, opexPerRouteKm: 3,
  },
  base: {
    ugPerKm: 130, elPerKm: 35, sfPerKm: 15, ugStation: 110, elStation: 15, sfStation: 5, interchangePremiumPct: 30, depotCost: 80,
    trainCost: 12, headwayMin: 5, landPct: 8, engineeringPct: 10, contingencyPct: 20, escalationPct: 3.5, railPerKm: 4, railStationCost: 3, railTrainCost: 6, opexPerRouteKm: 4,
  },
  high: {
    ugPerKm: 180, elPerKm: 50, sfPerKm: 25, ugStation: 160, elStation: 25, sfStation: 8, interchangePremiumPct: 50, depotCost: 120,
    trainCost: 16, headwayMin: 4, landPct: 15, engineeringPct: 14, contingencyPct: 30, escalationPct: 5, railPerKm: 7, railStationCost: 5, railTrainCost: 8, opexPerRouteKm: 6,
  },
}

export interface CostResult {
  tunnels: number
  viaducts: number
  surface: number
  stations: number
  interchangePremium: number
  depots: number
  construction: number
  trainsets: number
  rollingStock: number
  land: number
  engineering: number
  railUpgrade: number
  beforeContingency: number
  contingency: number
  real: number // in base-year prices
  escalationFactor: number
  nominal: number
  perKmReal: number
  opexPerYear: number
  fareRevenuePerYear: number
  farebox: number | null // share of operating cost recovered by fares
}

/** Trainsets for one line: round-trip time divided by the headway, plus spares. */
export function fleetFor(routeKm: number, i: Pick<CostInputs, 'speedKmh' | 'headwayMin' | 'turnaroundMin' | 'sparePct'>) {
  if (routeKm <= 0) return 0
  const cycleMin = (2 * routeKm / i.speedKmh) * 60 + 2 * i.turnaroundMin
  const inService = Math.ceil(cycleMin / i.headwayMin)
  return Math.ceil(inService * (1 + i.sparePct / 100))
}

export function computeCost(i: CostInputs, lineLengthsKm?: number[]): CostResult {
  const tunnels = i.undergroundKm * i.ugPerKm
  const viaducts = i.elevatedKm * i.elPerKm
  const surface = i.surfaceKm * i.sfPerKm
  const stations = i.stationsUnderground * i.ugStation + i.stationsElevated * i.elStation + i.stationsSurface * i.sfStation
  const totalStations = i.stationsUnderground + i.stationsElevated + i.stationsSurface
  // premium applied to an average station cost, once per interchange complex
  const avgStation = totalStations ? stations / totalStations : 0
  const interchangePremium = i.interchanges * avgStation * (i.interchangePremiumPct / 100)
  const depots = i.depots * i.depotCost
  const construction = tunnels + viaducts + surface + stations + interchangePremium + depots

  // fleet is sized per line where line lengths are given, otherwise spread evenly over the lines
  const lengths = lineLengthsKm?.length ? lineLengthsKm : Array.from({ length: Math.max(1, i.lines) }, () => i.routeKm / Math.max(1, i.lines))
  const scale = lineLengthsKm?.length ? i.routeKm / Math.max(1e-9, lineLengthsKm.reduce((a, b) => a + b, 0)) : 1
  const trainsets = lengths.reduce((n, l) => n + fleetFor(l * scale, i), 0)
  const rollingStock = trainsets * i.trainCost

  const land = construction * (i.landPct / 100)
  const engineering = construction * (i.engineeringPct / 100)
  const railUpgrade = i.includeRailUpgrade ? i.railKm * i.railPerKm + i.railStations * i.railStationCost + i.railTrains * i.railTrainCost : 0
  const beforeContingency = construction + rollingStock + land + engineering + railUpgrade
  const contingency = beforeContingency * (i.contingencyPct / 100)
  const real = beforeContingency + contingency
  const years = Math.max(0, i.midYear - i.baseYear)
  const escalationFactor = Math.pow(1 + i.escalationPct / 100, years)
  const nominal = real * escalationFactor
  const km = i.undergroundKm + i.elevatedKm + i.surfaceKm
  const opexPerYear = i.routeKm * i.opexPerRouteKm
  const fareRevenuePerYear = (i.ridersPerDay * i.fare * 365) / 1e6
  return {
    tunnels, viaducts, surface, stations, interchangePremium, depots, construction, trainsets, rollingStock, land, engineering, railUpgrade,
    beforeContingency, contingency, real, escalationFactor, nominal,
    // the existing-railway upgrade (with its share of contingency) is not new metro length, so it is left out
    perKmReal: km ? (real - railUpgrade * (1 + i.contingencyPct / 100)) / km : 0,
    opexPerYear, fareRevenuePerYear,
    farebox: opexPerYear > 0 && i.ridersPerDay > 0 ? fareRevenuePerYear / opexPerYear : null,
  }
}
