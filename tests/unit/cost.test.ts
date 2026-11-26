import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeCost, fleetFor, PRESETS, type CostInputs } from '../../src/lib/cost.ts'

const base: CostInputs = {
  undergroundKm: 10, elevatedKm: 20, surfaceKm: 5, stationsUnderground: 8, stationsElevated: 12, stationsSurface: 2,
  interchanges: 2, depots: 2, routeKm: 35, lines: 2,
  ugPerKm: 100, elPerKm: 30, sfPerKm: 10, ugStation: 100, elStation: 20, sfStation: 5, interchangePremiumPct: 25, depotCost: 50,
  trainCost: 10, speedKmh: 30, headwayMin: 6, turnaroundMin: 5, sparePct: 10,
  landPct: 10, engineeringPct: 10, contingencyPct: 20, escalationPct: 0, baseYear: 2026, midYear: 2026,
  includeRailUpgrade: false, railKm: 0, railPerKm: 0, railStations: 0, railStationCost: 0, railTrains: 0, railTrainCost: 0,
  opexPerRouteKm: 4, ridersPerDay: 100000, fare: 0.5,
}

test('fleet: cycle time over headway plus spares', () => {
  // 15 km at 30 km/h = 30 min each way, 60 + 2 x 5 turnaround = 70 min; 70 / 6 = 11.7 -> 12; +10% = 13.2 -> 14
  assert.equal(fleetFor(15, { speedKmh: 30, headwayMin: 6, turnaroundMin: 5, sparePct: 10 }), 14)
  assert.equal(fleetFor(0, { speedKmh: 30, headwayMin: 6, turnaroundMin: 5, sparePct: 10 }), 0)
})

test('capital cost adds components once, by hand', () => {
  const r = computeCost(base, [15, 20])
  assert.equal(r.tunnels, 1000)
  assert.equal(r.viaducts, 600)
  assert.equal(r.surface, 50)
  assert.equal(r.stations, 800 + 240 + 10)
  // average station 1050 / 22; premium 2 x avg x 25%
  assert.ok(Math.abs(r.interchangePremium - 2 * (1050 / 22) * 0.25) < 1e-9)
  assert.equal(r.depots, 100)
  const construction = 1000 + 600 + 50 + 1050 + 2 * (1050 / 22) * 0.25 + 100
  assert.ok(Math.abs(r.construction - construction) < 1e-9)
  // 15 km -> 14 trains; 20 km: 40 + 40 + 10 = 90 min / 6 = 15, x1.1 = 16.5 -> 17
  assert.equal(r.trainsets, 31)
  assert.equal(r.rollingStock, 310)
  const before = construction * 1.2 + 310
  assert.ok(Math.abs(r.beforeContingency - before) < 1e-9)
  assert.ok(Math.abs(r.real - before * 1.2) < 1e-9)
  assert.equal(r.nominal, r.real)
})

test('escalation compounds from base year to mid-construction year', () => {
  const r = computeCost({ ...base, escalationPct: 3, midYear: 2036 }, [15, 20])
  assert.ok(Math.abs(r.escalationFactor - 1.03 ** 10) < 1e-12)
  assert.ok(Math.abs(r.nominal - r.real * 1.03 ** 10) < 1e-6)
})

test('no interchanges means no premium; stations are not inside per-km rates', () => {
  const r = computeCost({ ...base, interchanges: 0, ugPerKm: 0, elPerKm: 0, sfPerKm: 0 }, [15, 20])
  assert.equal(r.interchangePremium, 0)
  assert.equal(r.tunnels + r.viaducts + r.surface, 0)
  assert.equal(r.stations, 1050)
})

test('farebox recovery uses riders x fare x 365 against route-km opex', () => {
  const r = computeCost(base, [15, 20])
  assert.ok(Math.abs(r.fareRevenuePerYear - 18.25) < 1e-9)
  assert.equal(r.opexPerYear, 140)
  assert.ok(Math.abs((r.farebox ?? 0) - 18.25 / 140) < 1e-12)
  assert.equal(computeCost({ ...base, ridersPerDay: 0 }, [15, 20]).farebox, null)
})

test('rail upgrade is excluded from the metro cost per km', () => {
  const without = computeCost(base, [15, 20])
  const withRail = computeCost({ ...base, includeRailUpgrade: true, railKm: 10, railPerKm: 5, railStations: 4, railStationCost: 2, railTrains: 2, railTrainCost: 5 }, [15, 20])
  assert.ok(withRail.real > without.real)
  assert.ok(Math.abs(withRail.perKmReal - without.perKmReal) < 1e-9)
})

test('presets order low < base < high on every cost rate', () => {
  for (const k of ['ugPerKm', 'elPerKm', 'ugStation', 'depotCost', 'trainCost', 'contingencyPct'] as const) {
    assert.ok(PRESETS.low[k]! < PRESETS.base[k]! && PRESETS.base[k]! < PRESETS.high[k]!, k)
  }
})
