import { useMemo, useState } from 'react'
import { useLang } from '../i18n'
import { ReportPage } from '../components/Layout'
import { Button, Note, SectionTitle, LineMark } from '../components/ui'
import { Cite } from '../components/Cite'
import { computeCost, PRESETS, type CostInputs, type Scenario } from '../lib/cost'
import { defaultInputs, lineLengthsKm, METRO_IDS } from '../lib/scenario'

const fmt = (m: number, d = 0) => m.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d })

function Field({ label, unit, value, onChange, step = 1, min = 0, hint }: { label: string; unit?: string; value: number; onChange: (v: number) => void; step?: number; min?: number; hint?: string }) {
  const id = `f-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 py-1.5 border-b border-line">
      <label htmlFor={id} className="text-[13.5px] leading-snug">
        {label}
        {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      </label>
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={Number.isFinite(value) ? value : 0}
          onChange={e => onChange(e.target.value === '' ? 0 : Math.max(min, Number(e.target.value)))}
          className="w-full h-8 px-2 border border-line-strong rounded-sm text-right font-mono text-[13px]"
        />
        <span className="text-[12px] text-muted w-10 shrink-0" aria-hidden={!unit}>{unit}</span>
      </div>
    </div>
  )
}

const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="border border-line p-4 m-0 min-w-0">
    <legend className="px-1 text-[14px] font-semibold text-navy-900">{title}</legend>
    {children}
  </fieldset>
)

// Benchmarks. Totals and quantities are as published (see references). US$ equivalents use the stated, assumed exchange
// rate for the price period and are for orientation only: price years, scope and currencies differ between projects.
const BENCH = [
  { p: 'Ho Chi Minh City Line 1', len: 19.7, ug: '2.5', st: 14, total: 'VND 43.7 trillion', usd: 1720, rate: 'US$ figure as published', ref: ['R14', 'R15'], scope: 'Total investment' },
  { p: 'Hanoi Line 2A', len: 13, ug: '0 (elevated)', st: 12, total: 'VND 18 trillion', usd: 868, rate: 'US$ figure as published', ref: ['R16'], scope: 'Total; 57% over the original estimate' },
  { p: 'Hanoi Line 3', len: 12.5, ug: 'about 4', st: 12, total: 'VND 34,826 billion', usd: 34826 / 24, rate: 'assumed VND 24,000 per US$', ref: ['R17'], scope: 'Approved total (2023)' },
  { p: 'Jakarta MRT Phase 1', len: 15.7, ug: '5.9', st: 13, total: '¥164,903 million', usd: 164903 / 110, rate: 'assumed ¥110 per US$', ref: ['R18'], scope: 'JICA programme cost' },
  { p: 'Jakarta MRT Phase 2', len: 6, ug: '6', st: 7, total: '¥290,530 million', usd: 290530 / 140, rate: 'assumed ¥140 per US$', ref: ['R18'], scope: 'JICA programme cost' },
  { p: 'Metro Manila Subway Phase 1', len: 27, ug: '27', st: 15, total: '¥1,492,912 million', usd: 1492912 / 150, rate: 'assumed ¥150 per US$', ref: ['R19'], scope: 'Estimated project cost (2026)' },
  { p: 'Bangkok Purple Line', len: 23, ug: '0 (elevated)', st: 16, total: '¥212,455 million', usd: 212455 / 100, rate: 'assumed ¥100 per US$', ref: ['R20'], scope: 'Actual cost incl. land' },
  { p: 'Kuala Lumpur Putrajaya Line', len: 57.7, ug: '13.5', st: 36, total: 'RM 30.53 billion', usd: 30530 / 4.2, rate: 'assumed RM 4.2 per US$', ref: ['R21', 'R22'], scope: 'Construction only; excludes land and interest' },
  { p: 'Phnom Penh AGT pre-feasibility (2014)', len: 13.7, ug: '2 stations', st: 13, total: 'US$759 million', usd: 759, rate: '2014 prices, as published', ref: ['R3'], scope: 'Initial construction cost' },
]

export function FinancePage() {
  const { t } = useLang()
  const [scenario, setScenario] = useState<Scenario | 'custom'>('base')
  const [ids, setIds] = useState<string[]>(METRO_IDS)
  const [inp, setInp] = useState<CostInputs>(() => defaultInputs('base'))
  const set = <K extends keyof CostInputs>(k: K) => (v: CostInputs[K]) => { setInp(i => ({ ...i, [k]: v })); setScenario('custom') }
  const lengths = lineLengthsKm(ids)
  const r = useMemo(() => computeCost(inp, lengths), [inp, lengths])
  const compare = useMemo(() => (['low', 'base', 'high'] as Scenario[]).map(s => ({ s, r: computeCost({ ...inp, ...PRESETS[s] }, lengths) })), [inp, lengths])

  const applyPreset = (s: Scenario) => { setScenario(s); setInp(i => ({ ...i, ...PRESETS[s] })) }
  const toggleLine = (id: string) => {
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id].sort()
    if (!next.length) return
    setIds(next)
    // quantities follow the selected lines; unit rates and percentages are kept
    const q = defaultInputs('base', next)
    setInp(i => ({ ...i, undergroundKm: q.undergroundKm, elevatedKm: q.elevatedKm, surfaceKm: q.surfaceKm, stationsUnderground: q.stationsUnderground, stationsElevated: q.stationsElevated, stationsSurface: q.stationsSurface, interchanges: q.interchanges, depots: q.depots, routeKm: q.routeKm, lines: q.lines }))
  }
  const resetAll = () => { setIds(METRO_IDS); setInp(defaultInputs('base')); setScenario('base') }

  const rows: [string, number][] = [
    ['Underground tunnels, track and systems', r.tunnels],
    ['Elevated viaduct, track and systems', r.viaducts],
    ['Surface track and systems', r.surface],
    ['Stations', r.stations],
    ['Interchange premium (once per interchange)', r.interchangePremium],
    ['Depots', r.depots],
    [`Rolling stock (${r.trainsets} trainsets)`, r.rollingStock],
    ['Land acquisition and resettlement', r.land],
    ['Engineering and project management', r.engineering],
    ['Existing railway upgrade (Line 5)', r.railUpgrade],
    ['Contingency', r.contingency],
  ]

  return (
    <ReportPage
      title={t('nav.finance')}
      lead="A preliminary cost estimation tool. All unit costs are assumptions for discussion, set within the range implied by the regional projects listed below. They are not quotations and do not replace a costed feasibility study."
    >
      <Note tone="warn">
        Estimates, assumptions and verified figures are kept apart on this page. Published project totals in the benchmark table are verified against their sources.
        Unit costs, percentages and the results of the calculator are assumptions. No ridership forecast exists for this network, so no revenue or return is presented as fact.
      </Note>

      <SectionTitle>Cost estimation tool</SectionTitle>
      <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Scenario">
        <span className="text-[13px] text-muted mr-1">Scenario</span>
        {(['low', 'base', 'high'] as Scenario[]).map(s => (
          <Button key={s} variant={scenario === s ? 'primary' : 'default'} aria-pressed={scenario === s} onClick={() => applyPreset(s)}>{s[0].toUpperCase() + s.slice(1)}</Button>
        ))}
        {scenario === 'custom' && <span className="text-[13px] text-muted">Custom values</span>}
        <Button variant="ghost" onClick={resetAll}>Reset</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-6" role="group" aria-label="Lines included">
        <span className="text-[13px] text-muted">Lines included</span>
        {METRO_IDS.map(id => (
          <label key={id} className="inline-flex items-center gap-2 h-9 px-3 border border-line rounded-sm cursor-pointer text-[13.5px]">
            <input type="checkbox" checked={ids.includes(id)} onChange={() => toggleLine(id)} className="accent-navy-900" />
            <LineMark id={id} withName />
          </label>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-4 grid-cols-[minmax(0,1fr)] md:grid-cols-2 content-start min-w-0">
          <Group title="Quantities (from the network geometry)">
            <Field label="Underground length" unit="km" step={0.1} value={inp.undergroundKm} onChange={set('undergroundKm')} />
            <Field label="Elevated length" unit="km" step={0.1} value={inp.elevatedKm} onChange={set('elevatedKm')} />
            <Field label="Surface length" unit="km" step={0.1} value={inp.surfaceKm} onChange={set('surfaceKm')} />
            <Field label="Underground stations" value={inp.stationsUnderground} onChange={set('stationsUnderground')} />
            <Field label="Elevated stations" value={inp.stationsElevated} onChange={set('stationsElevated')} />
            <Field label="Surface stations" value={inp.stationsSurface} onChange={set('stationsSurface')} />
            <Field label="Interchange stations" hint="Each counted once" value={inp.interchanges} onChange={set('interchanges')} />
            <Field label="Depots" hint="Shared depots counted once" value={inp.depots} onChange={set('depots')} />
          </Group>
          <Group title="Construction unit costs (assumptions, 2026 US$)">
            <Field label="Underground per km" hint="Excludes stations, depots, trains" unit="$m" step={5} value={inp.ugPerKm} onChange={set('ugPerKm')} />
            <Field label="Elevated per km" hint="Excludes stations, depots, trains" unit="$m" step={1} value={inp.elPerKm} onChange={set('elPerKm')} />
            <Field label="Surface per km" unit="$m" step={1} value={inp.sfPerKm} onChange={set('sfPerKm')} />
            <Field label="Underground station" unit="$m" step={5} value={inp.ugStation} onChange={set('ugStation')} />
            <Field label="Elevated station" unit="$m" step={1} value={inp.elStation} onChange={set('elStation')} />
            <Field label="Surface station" unit="$m" step={1} value={inp.sfStation} onChange={set('sfStation')} />
            <Field label="Interchange premium" hint="Share of an average station" unit="%" value={inp.interchangePremiumPct} onChange={set('interchangePremiumPct')} />
            <Field label="Depot" unit="$m" step={5} value={inp.depotCost} onChange={set('depotCost')} />
          </Group>
          <Group title="Rolling stock and service">
            <Field label="Trainset cost" unit="$m" step={0.5} value={inp.trainCost} onChange={set('trainCost')} />
            <Field label="Peak headway" unit="min" step={0.5} min={1} value={inp.headwayMin} onChange={set('headwayMin')} />
            <Field label="Commercial speed" unit="km/h" min={10} value={inp.speedKmh} onChange={set('speedKmh')} />
            <Field label="Turnaround per terminal" unit="min" value={inp.turnaroundMin} onChange={set('turnaroundMin')} />
            <Field label="Spare trains" unit="%" value={inp.sparePct} onChange={set('sparePct')} />
          </Group>
          <Group title="On-costs, contingency and inflation">
            <Field label="Land acquisition" hint="% of construction" unit="%" step={0.5} value={inp.landPct} onChange={set('landPct')} />
            <Field label="Engineering and management" hint="% of construction" unit="%" step={0.5} value={inp.engineeringPct} onChange={set('engineeringPct')} />
            <Field label="Contingency" hint="% of all items" unit="%" value={inp.contingencyPct} onChange={set('contingencyPct')} />
            <Field label="Annual escalation" unit="%" step={0.1} value={inp.escalationPct} onChange={set('escalationPct')} />
            <Field label="Mid-point of construction" unit="year" min={2026} value={inp.midYear} onChange={set('midYear')} />
          </Group>
          <Group title="Existing railway upgrade (Line 5)">
            <label className="flex items-center gap-2 text-[13.5px] py-1.5 border-b border-line cursor-pointer">
              <input type="checkbox" checked={inp.includeRailUpgrade} onChange={e => set('includeRailUpgrade')(e.target.checked)} className="accent-navy-900" />
              Include the commuter rail upgrade
            </label>
            <Field label="Track and signalling per km" unit="$m" step={0.5} value={inp.railPerKm} onChange={set('railPerKm')} />
            <Field label="Length" unit="km" step={0.1} value={inp.railKm} onChange={set('railKm')} />
            <Field label="Stations" value={inp.railStations} onChange={set('railStations')} />
            <Field label="Station cost" unit="$m" step={0.5} value={inp.railStationCost} onChange={set('railStationCost')} />
            <Field label="Trains" value={inp.railTrains} onChange={set('railTrains')} />
            <Field label="Train cost" unit="$m" step={0.5} value={inp.railTrainCost} onChange={set('railTrainCost')} />
          </Group>
          <Group title="Operating cost and fares (scenario only)">
            <Field label="Operating and maintenance cost" hint="Per route-km per year, assumption" unit="$m" step={0.5} value={inp.opexPerRouteKm} onChange={set('opexPerRouteKm')} />
            <Field label="Riders per day" hint="Enter a scenario value; no forecast exists" step={10000} value={inp.ridersPerDay} onChange={set('ridersPerDay')} />
            <Field label="Average fare per trip" unit="US$" step={0.05} value={inp.fare} onChange={set('fare')} />
          </Group>
        </div>

        <aside className="xl:sticky xl:top-4 self-start border border-navy-900 bg-white" aria-live="polite">
          <div className="bg-navy-900 text-white px-4 py-3">
            <div className="text-[13px] text-white/75">Estimated capital cost, 2026 prices</div>
            <div className="text-[28px] font-semibold font-mono leading-tight">US$ {fmt(r.real / 1000, 2)} bn</div>
            <div className="text-[13px] text-white/75">{fmt(r.perKmReal, 0)} million per km of new metro</div>
          </div>
          <table className="tbl">
            <tbody>
              {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num font-mono">{fmt(v)}</td></tr>)}
            </tbody>
            <tfoot>
              <tr><td>Total, 2026 prices (US$ million)</td><td className="num font-mono">{fmt(r.real)}</td></tr>
              <tr><td>Escalation factor to {inp.midYear}</td><td className="num font-mono">{r.escalationFactor.toFixed(3)}</td></tr>
              <tr><td>Total, escalated (US$ million)</td><td className="num font-mono">{fmt(r.nominal)}</td></tr>
            </tfoot>
          </table>
          <div className="px-4 py-3 border-t border-line text-[13px]">
            <div className="flex justify-between"><span>Operating cost per year</span><span className="font-mono">US$ {fmt(r.opexPerYear)} m</span></div>
            <div className="flex justify-between"><span>Fare revenue per year</span><span className="font-mono">{inp.ridersPerDay ? `US$ ${fmt(r.fareRevenuePerYear, 1)} m` : 'enter riders'}</span></div>
            <div className="flex justify-between"><span>Fares as share of operating cost</span><span className="font-mono">{r.farebox == null ? 'n/a' : `${fmt(r.farebox * 100)}%`}</span></div>
          </div>
          <table className="tbl wrap border-t border-line">
            <thead><tr><th>Preset, same quantities</th><th className="num">2026 US$ bn</th><th className="num">Escalated</th></tr></thead>
            <tbody>
              {compare.map(({ s, r: c }) => <tr key={s}><td className="capitalize">{s}</td><td className="num font-mono">{fmt(c.real / 1000, 2)}</td><td className="num font-mono">{fmt(c.nominal / 1000, 2)}</td></tr>)}
            </tbody>
          </table>
        </aside>
      </div>

      <div className="prose-report max-w-[90ch]">
        <h2>How the estimate avoids double counting</h2>
        <ul>
          <li>Per-kilometre rates cover tunnels or viaducts, track, power, signalling and communications only. Stations, depots and trains are priced separately, so a rate taken from an all-in project total must not be entered here unchanged.</li>
          <li>An interchange station is one physical complex. It is counted once in the station totals, with a premium for its extra size, not once per line.</li>
          <li>The shared Chom Chao depot of Lines 2 and 3 is counted once.</li>
          <li>Land, engineering and contingency are percentages of the items above, applied once. Escalation is applied last, to the 2026-price total.</li>
          <li>Fleet size follows the service assumptions: round-trip time divided by the peak headway, plus spares, per line.</li>
        </ul>
      </div>

      <SectionTitle>Comparable projects in Southeast Asia</SectionTitle>
      <div className="overflow-x-auto border border-line">
        <table className="tbl min-w-[1080px]">
          <thead>
            <tr><th>Project</th><th className="num">Length (km)</th><th>Underground</th><th className="num">Stations</th><th>Published total</th><th>Scope</th><th className="num">About US$ m</th><th className="num">US$ m per km</th><th>Conversion</th><th>Source</th></tr>
          </thead>
          <tbody>
            {BENCH.map(b => (
              <tr key={b.p}>
                <td>{b.p}</td><td className="num">{b.len}</td><td>{b.ug}</td><td className="num">{b.st}</td><td className="whitespace-nowrap">{b.total}</td><td>{b.scope}</td>
                <td className="num font-mono">{fmt(Math.round(b.usd / 10) * 10)}</td><td className="num font-mono">{fmt(b.usd / b.len)}</td><td className="text-muted text-[12.5px]">{b.rate}</td><td><Cite ids={b.ref} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-muted mt-2 max-w-[100ch]">
        Published totals, lengths and station counts are verified against the sources. US$ columns are approximate conversions at the assumed rates shown and are for orientation only;
        price years, scopes (land, interest, rolling stock) and currencies differ, so the per-km figures are not like-for-like. Underground-heavy projects (Jakarta Phase 2, Manila) fall at
        several hundred million US$ per km; elevated lines (Hanoi 2A, Bangkok Purple) at well under one hundred million.
      </p>

      <div className="prose-report max-w-[90ch]">
        <h2>Operating costs, fares and maintenance</h2>
        <p>
          Metro operating costs cover staff, energy, maintenance of track, trains, stations and systems, and insurance. The operating cost per route-kilometre in the tool is an
          assumption and should be replaced with benchmarks from operators in the region during the feasibility stage. Maintenance needs grow with age: trains need heavy overhaul
          around mid-life, and tunnel and viaduct structures need regular inspection and drainage maintenance, which is critical in a flood-prone city.
        </p>
        <p>
          Fares are a policy choice. They have to be set against bus fares and the incomes of likely riders; a high fare reduces ridership and the wider benefits that justify
          public funding. Few metros worldwide cover their operating costs from fares alone, and none of the regional examples above was financed from fares. The fare scenario in the
          tool shows only what a given ridership would raise; it is not a forecast.
        </p>

        <h2>Funding options</h2>
        <ul>
          <li><strong>Official development assistance loans.</strong> JICA yen loans financed metros in Jakarta, Manila and Bangkok and Ho Chi Minh City Line 1 <Cite ids={['R18', 'R19', 'R20', 'R14']} />. Chinese loans financed most of Hanoi Line 2A <Cite ids={['R16']} />.</li>
          <li><strong>Multilateral and co-financing.</strong> Hanoi Line 3 combines French, ADB and EIB finance <Cite ids={['R17']} />. AIIB is supporting the current Phnom Penh study; no AIIB construction loan for a Phnom Penh metro has been found <Cite ids={['R5', 'R30']} />.</li>
          <li><strong>Public-private partnership.</strong> The government has stated a hope for private investment in urban rail <Cite ids={['R4']} />. A PPP still needs public support where fares do not cover costs, and the risk allocation must be clear.</li>
          <li><strong>Land value capture.</strong> Development rights above and around stations and depots, and contributions from developments that gain access, can fund part of the cost if the land is secured early.</li>
          <li><strong>Staging.</strong> Building the central section first, and the commuter rail on the existing track as an early step, spreads the cost over several budget cycles.</li>
        </ul>
        <Note>
          The 2014 AGT line was estimated at US$759 million with an economic return of 21% but a financial return of about −0.3%, and was suspended mainly for financial reasons <Cite ids={['R3', 'R4']} />.
          A Phnom Penh metro should be expected to need public funding for construction and possibly for operation.
        </Note>
      </div>
    </ReportPage>
  )
}
