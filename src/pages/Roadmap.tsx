import { useLang } from '../i18n'
import { ReportPage } from '../components/Layout'
import { Note, SectionTitle } from '../components/ui'
import { Cite } from '../components/Cite'

type Kind = 'study' | 'design' | 'finance' | 'land' | 'procure' | 'build' | 'test' | 'external'

const KIND: Record<Kind, { label: string; fill: string; stroke: string }> = {
  external: { label: 'Official study (external)', fill: '#e6ecf5', stroke: '#1a3560' },
  study: { label: 'Studies and surveys', fill: '#dfe7d8', stroke: '#3d6b2f' },
  design: { label: 'Design', fill: '#e9e1f2', stroke: '#5b3f86' },
  finance: { label: 'Financing', fill: '#f6ecd5', stroke: '#8a5300' },
  land: { label: 'Land and utilities', fill: '#f1dfd6', stroke: '#8a3f1a' },
  procure: { label: 'Procurement', fill: '#e4e4e4', stroke: '#444' },
  build: { label: 'Construction', fill: '#1a3560', stroke: '#1a3560' },
  test: { label: 'Testing and commissioning', fill: '#7d93b8', stroke: '#1a3560' },
}

type Row = { group: string; task: string; from: number; to: number; kind: Kind; note?: string }

const ROWS: Row[] = [
  { group: 'Preparation', task: 'MPWT and AIIB feasibility study (reported completion)', from: 2025, to: 2027, kind: 'external' },
  { group: 'Preparation', task: 'Household travel survey and travel demand model', from: 2027, to: 2029, kind: 'study' },
  { group: 'Preparation', task: 'Corridor and depot land protection in the land use plan', from: 2027, to: 2029, kind: 'land' },
  { group: 'Preparation', task: 'Geotechnical, groundwater and hydrological investigations', from: 2028, to: 2031, kind: 'study' },
  { group: 'Preparation', task: 'Environmental and social impact assessment (scoping and baseline)', from: 2028, to: 2031, kind: 'study' },
  { group: 'Preparation', task: 'Route selection and preliminary design', from: 2029, to: 2031, kind: 'design' },
  { group: 'Line 5 (early action)', task: 'Commuter service study on the existing railway', from: 2027, to: 2028, kind: 'study' },
  { group: 'Line 5 (early action)', task: 'Track, station and signalling upgrade', from: 2029, to: 2031, kind: 'build' },
  { group: 'Line 5 (early action)', task: 'Trial operation', from: 2031, to: 2032, kind: 'test' },
  { group: 'Phase 1: Line 1 central', task: 'Financing agreements', from: 2030, to: 2032, kind: 'finance' },
  { group: 'Phase 1: Line 1 central', task: 'Detailed design', from: 2031, to: 2033, kind: 'design' },
  { group: 'Phase 1: Line 1 central', task: 'Land acquisition, resettlement and utility diversion', from: 2031, to: 2034, kind: 'land' },
  { group: 'Phase 1: Line 1 central', task: 'Procurement', from: 2032, to: 2033, kind: 'procure' },
  { group: 'Phase 1: Line 1 central', task: 'Construction', from: 2033, to: 2039, kind: 'build' },
  { group: 'Phase 1: Line 1 central', task: 'Testing and commissioning', from: 2039, to: 2040, kind: 'test' },
  { group: 'Phase 2: Line 1 airport and Line 2', task: 'Design and financing', from: 2035, to: 2038, kind: 'design' },
  { group: 'Phase 2: Line 1 airport and Line 2', task: 'Land and procurement', from: 2036, to: 2038, kind: 'land' },
  { group: 'Phase 2: Line 1 airport and Line 2', task: 'Construction', from: 2038, to: 2044, kind: 'build' },
  { group: 'Phase 2: Line 1 airport and Line 2', task: 'Testing and commissioning', from: 2044, to: 2045, kind: 'test' },
  { group: 'Phase 3: Lines 3 and 4', task: 'Design, financing and land', from: 2040, to: 2044, kind: 'design' },
  { group: 'Phase 3: Lines 3 and 4', task: 'Construction', from: 2044, to: 2049, kind: 'build' },
  { group: 'Phase 3: Lines 3 and 4', task: 'Testing and commissioning', from: 2049, to: 2050, kind: 'test' },
  { group: 'Future extensions', task: 'Takhmao branch, Morodok Techo, Phnom Penh Thmey (if demand is shown)', from: 2046, to: 2051, kind: 'study' },
]

const Y0 = 2025
const Y1 = 2051

export function RoadmapPage() {
  const { t } = useLang()
  const years = Array.from({ length: Y1 - Y0 }, (_, i) => Y0 + i)
  const groups = [...new Set(ROWS.map(r => r.group))]
  const pct = (y: number) => ((y - Y0) / (Y1 - Y0)) * 100
  return (
    <ReportPage
      title={t('nav.roadmap')}
      lead="An indicative implementation scenario to 2050. Every date is a conditional planning assumption, not an official commitment, and depends on decisions, funding and studies that have not yet taken place."
    >
      <Note tone="warn">
        This is a scenario for discussion. The official feasibility study is reported to be due in 2027 and no construction date has been set <Cite ids={['R7']} />.
        The timeline below assumes that each decision gate is passed without delay; in practice each gate can move the following stages by years.
      </Note>

      <SectionTitle>Indicative programme</SectionTitle>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-3 text-[12.5px]">
        {(Object.keys(KIND) as Kind[]).map(k => (
          <span key={k} className="inline-flex items-center gap-2"><span className="w-5 h-3 border" style={{ background: KIND[k].fill, borderColor: KIND[k].stroke }} aria-hidden="true" />{KIND[k].label}</span>
        ))}
      </div>
      <div className="overflow-x-auto border border-line">
        <div className="min-w-[1100px]">
          <div className="grid grid-cols-[340px_minmax(0,1fr)] border-b border-line-strong bg-panel text-[11.5px] font-mono">
            <div className="px-3 py-2 font-sans font-semibold text-[13px]">Activity</div>
            <div className="relative h-full">
              {years.map(y => (
                <span key={y} className="absolute top-0 bottom-0 flex items-center border-l border-line pl-1 text-muted" style={{ left: `${pct(y)}%`, width: `${100 / years.length}%` }}>
                  {y % 5 === 0 || y === Y0 ? y : String(y).slice(2)}
                </span>
              ))}
            </div>
          </div>
          {groups.map(g => (
            <div key={g}>
              <div className="px-3 py-1.5 text-[13px] font-semibold bg-navy-50 border-b border-line">{g}</div>
              {ROWS.filter(r => r.group === g).map(r => (
                <div key={r.task} className="grid grid-cols-[340px_minmax(0,1fr)] border-b border-line text-[13px]">
                  <div className="px-3 py-2 leading-snug">{r.task}</div>
                  <div className="relative">
                    {years.map(y => <span key={y} className="absolute top-0 bottom-0 border-l border-line/60" style={{ left: `${pct(y)}%` }} aria-hidden="true" />)}
                    <span
                      className="absolute top-1/2 -translate-y-1/2 h-4 border"
                      style={{ left: `${pct(r.from)}%`, width: `${pct(r.to) - pct(r.from)}%`, background: KIND[r.kind].fill, borderColor: KIND[r.kind].stroke }}
                      title={`${r.task}: ${r.from} to ${r.to} (scenario)`}
                    />
                    <span className="sr-only">{r.from} to {r.to}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="prose-report max-w-[90ch]">
        <h2>Decision gates</h2>
        <ol>
          <li><strong>Corridor protection.</strong> Agreement to reserve corridors, station sites and depot land in the land use plan, independent of construction timing.</li>
          <li><strong>Demand evidence.</strong> A travel demand model shows which line carries enough passengers to justify rail over bus rapid transit.</li>
          <li><strong>Ground and flood evidence.</strong> Investigations confirm that the underground sections and river crossings are feasible at acceptable cost and risk.</li>
          <li><strong>Funding.</strong> A financing plan that the public budget can carry, including any operating support.</li>
          <li><strong>Environmental and social approval.</strong> Impact assessment, resettlement plan and consultation completed to the standard of the financing institution.</li>
          <li><strong>Institutional readiness.</strong> A project agency with the authority and staff to manage design, land, contracts and operations.</li>
        </ol>

        <h2>Activities in each stage</h2>
        <h3>Feasibility studies and demand modelling</h3>
        <p>
          The proposal should be compared with the MPWT and AIIB feasibility study when it is published. A household travel survey, traffic counts and a calibrated
          demand model are needed before ridership or revenue can be stated; this proposal does not contain a forecast.
        </p>
        <h3>Environmental, social and geological work</h3>
        <p>
          Baseline surveys of noise, air quality, water, heritage and affected households; boreholes and groundwater monitoring through full seasons; and a hydrological
          study to set flood levels. See the Engineering and Environment pages.
        </p>
        <h3>Route selection, detailed engineering and procurement</h3>
        <p>
          Alternatives are compared on cost, demand, risk and impact, then refined through preliminary and detailed design. Contracts are usually split into civil works,
          systems, trains and depot, or let as a design-build contract; the choice depends on the financing institution and the market.
        </p>
        <h3>Construction, testing and commissioning</h3>
        <p>
          Underground lines in the region have typically taken six years or more from the start of civil works to opening, with testing and trial running in the final year.
          Ho Chi Minh City Line 1 opened in December 2024 <Cite ids={['R14']} />; Hanoi Line 2A, which opened in 2021, cost 57% more than its original estimate <Cite ids={['R16']} />. Schedule and cost
          risk should be allowed for from the start.
        </p>
      </div>
    </ReportPage>
  )
}
