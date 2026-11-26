import { useEffect } from 'react'
import { MapPinned } from 'lucide-react'
import { lines, stationById, km, extensions, type Line } from '../data/network'
import { useLang } from '../i18n'
import { ReportPage } from '../components/Layout'
import { LineMark, Button, Note } from '../components/ui'
import { Cite } from '../components/Cite'
import { href, navigate } from '../router'

const TYPE_STYLE: Record<string, { dash?: string; core?: string }> = {
  underground: {},
  elevated: { core: 'solid' },
  surface: { core: 'dash' },
}

/** Station-by-station strip: spacing is proportional to distance along the line. */
function Strip({ l }: { l: Line }) {
  const { name } = useLang()
  const total = l.segments.reduce((a, s) => a + s.lengthM, 0)
  const W = 1000
  const left = 20
  const right = 170 // room for the last angled label
  const x = (m: number) => left + (m / total) * (W - left - right)
  let acc = 0
  const pos = [0, ...l.segments.map(s => (acc += s.lengthM))]
  return (
    <div className="overflow-x-auto border border-line bg-white">
      <svg viewBox={`0 0 ${W} 150`} className="min-w-[760px] w-full h-auto block" role="img" aria-label={`${l.en} station diagram`}>
        {l.segments.map((s, i) => {
          const st = TYPE_STYLE[s.type]
          return (
            <g key={i}>
              <line x1={x(pos[i])} x2={x(pos[i + 1])} y1={40} y2={40} stroke={l.color} strokeWidth={8} />
              {st.core && <line x1={x(pos[i])} x2={x(pos[i + 1])} y1={40} y2={40} stroke="#fff" strokeWidth={2} strokeDasharray={st.core === 'dash' ? '5 5' : undefined} />}
              <text x={(x(pos[i]) + x(pos[i + 1])) / 2} y={22} textAnchor="middle" fontSize={10} fill="#5d6877" fontFamily="IBM Plex Mono, monospace">{(s.lengthM / 1000).toFixed(1)}</text>
            </g>
          )
        })}
        {l.stations.map((id, i) => {
          const s = stationById.get(id)!
          const cx = x(pos[i])
          return (
            <g key={id}>
              <circle cx={cx} cy={40} r={s.interchange ? 8 : 6} fill={s.terminal && !s.interchange ? l.color : '#fff'} stroke={s.interchange ? '#1b2430' : s.terminal ? '#fff' : l.color} strokeWidth={s.interchange ? 3 : 2.5} />
              <text transform={`translate(${cx + 3},60) rotate(40)`} fontSize={11.5} fill="#1b2430" fontFamily="IBM Plex Sans, Noto Sans Khmer, sans-serif">{name(s)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function LineSection({ l }: { l: Line }) {
  const { t, name } = useLang()
  const ext = extensions.filter(x => x.line === l.id)
  const notes = l.segments.filter(s => s.note)
  return (
    <section id={l.id} className="scroll-mt-28 border-t border-line pt-6 mt-8 first:mt-0 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-[19px] font-semibold text-navy-900"><LineMark id={l.id} withName /></h2>
        <Button onClick={() => navigate(href('map', { line: l.id }))}><MapPinned size={15} aria-hidden="true" />{t('st.showOnMap')}</Button>
      </div>
      <p className="max-w-[90ch] mb-4">{l.summary}</p>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Strip l={l} />
          <p className="text-[12.5px] text-muted mt-1">Spacing is proportional to distance. Figures above the line are kilometres between stations. White core: elevated; dashed core: surface; plain: underground.</p>
          {notes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[15px] font-semibold mb-2">Section notes</h3>
              <ul className="text-[14px] list-disc pl-5 space-y-1">
                {notes.map(s => <li key={`${s.from}-${s.to}`}>{name(stationById.get(s.from)!)} to {name(stationById.get(s.to)!)}: {s.note}</li>)}
              </ul>
            </div>
          )}
          {ext.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[15px] font-semibold mb-2">{t('layer.extensions')}</h3>
              <ul className="text-[14px] list-disc pl-5 space-y-1">
                {ext.map(x => <li key={x.id}>{name(x)} ({km(x.lengthM)} km to {x.toEn}): {x.why}</li>)}
              </ul>
            </div>
          )}
        </div>
        <table className="tbl wrap self-start border border-line table-fixed">
          <tbody>
            <tr><th scope="row">{t('common.length')}</th><td className="num">{km(l.lengthM, 2)} km</td></tr>
            <tr><th scope="row">{t('type.underground')}</th><td className="num">{km(l.byType.underground, 2)} km</td></tr>
            <tr><th scope="row">{t('type.elevated')}</th><td className="num">{km(l.byType.elevated, 2)} km</td></tr>
            <tr><th scope="row">{t('type.surface')}</th><td className="num">{km(l.byType.surface, 2)} km</td></tr>
            <tr><th scope="row">{t('common.stations')}</th><td className="num">{l.stations.length}</td></tr>
            <tr><th scope="row">Station spacing</th><td className="num">{km(l.stationSpacingM.min, 2)} to {km(l.stationSpacingM.max, 2)} km</td></tr>
            <tr><th scope="row">Mean spacing</th><td className="num">{km(l.stationSpacingM.mean, 2)} km</td></tr>
            {l.curves && (
              <tr>
                <th scope="row">Tightest curve</th>
                <td className="num">{l.curves.minRadiusM} m{l.curves.belowTarget > 0 && <span className="block text-warn text-[12px] whitespace-normal text-right">{l.curves.belowTarget} below the {l.curves.designRadiusM} m target</span>}</td>
              </tr>
            )}
            <tr>
              <th scope="row">River crossings</th>
              <td className="num whitespace-normal">{l.riverCrossings.length ? l.riverCrossings.map(c => `${c.river}, ${c.lengthM} m, ${c.segmentType}`).join('; ') : 'None detected'}</td>
            </tr>
            <tr><th scope="row">Depot</th><td className="whitespace-normal">{name(l.depot)}<span className="block text-muted text-[12px]">{l.depot.note}</span></td></tr>
            <tr><th scope="row">Phase</th><td className="whitespace-normal">{l.phase}</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function LinesPage() {
  const { t } = useLang()
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])
  return (
    <ReportPage
      title={t('nav.lines')}
      lead="Five candidate corridors: four new metro lines and a commuter service on the existing railway. Every figure on this page is computed from the routed alignment geometry."
    >
      <nav aria-label="Lines" className="flex flex-wrap gap-2 mb-8">
        {lines.map(l => <a key={l.id} href={`#${l.id}`} className="inline-flex items-center h-9 px-3 border border-line rounded-sm hover:bg-panel text-[13.5px]"><LineMark id={l.id} withName /></a>)}
        <a href="#evaluation" className="inline-flex items-center h-9 px-3 border border-line rounded-sm hover:bg-panel text-[13.5px]">Evaluation and method</a>
      </nav>
      {lines.map(l => <LineSection key={l.id} l={l} />)}

      <section id="evaluation" className="scroll-mt-28 border-t border-line pt-6 mt-10 prose-report max-w-[90ch]">
        <h2 className="!mt-0">Evaluation and method</h2>
        <h3>How the corridors were chosen</h3>
        <p>
          The 2014 JICA master plan screened three corridors for its priority project: north-south along Monivong Boulevard, east-west along Russian Boulevard,
          and southwest along Charles de Gaulle and Monireth Boulevards <Cite ids={['R2']} />. Lines 1, 2 and 3 follow these corridors. Line 1 adds Techo International
          Airport, which opened in September 2025 about 20 km south of the city <Cite ids={['R11']} />. Line 4 links the northwestern growth areas of Sen Sok and Tuol Kouk to the three
          trunk lines. Line 5 reuses the existing railway, as the master plan's commuter rail programme also proposed <Cite ids={['R2']} />.
        </p>
        <h3>Earlier five-line proposal</h3>
        <p>
          The earlier five-line network was not available for this review, so it could not be compared line by line. The present network was developed
          independently from the published corridors, the road and river geometry, and the locations listed in the brief. Locations were not forced into the
          network where they would cause detours: Takhmao is served by a short branch rather than by diverting the airport line, Koh Norea is reached from
          National Road 1, and Morodok Techo is left as a future extension that should be justified by demand.
        </p>
        <h3>Underground, elevated and surface</h3>
        <p>
          Underground construction is used inside the dense core, broadly inside the Inner Ring Road, as in the 2014 plan <Cite ids={['R2']} />. Elevated construction is used on
          wide outer boulevards and national roads, and surface construction only on open land near the airport and on the existing railway. The 2014 pre-feasibility
          study reported that elevated structures were not permitted on Russian Boulevard <Cite ids={['R3']} />, so the elevated section of Line 2 west of the former airport
          needs approval or must be placed underground; the cost tool can test both.
        </p>
        <h3>Geometry checks</h3>
        <ul>
          <li>Alignments are routed on OpenStreetMap road and railway centrelines <Cite ids={['R29']} />, simplified to the street corridor and given circular curves with a 300 m design radius (250 m on Line 4).</li>
          <li>Where a curve cannot reach the design radius within the available straight, the smaller radius is reported above and must be resolved in design.</li>
          <li>Stations that sit on a bend are given a straight 300 m section so that at least 150 m of platform is on straight track. The station directory flags stations that still lie on a curve.</li>
          <li>River crossings are found by intersecting each alignment with OpenStreetMap river polygons. Narrow channels that are not mapped as water areas, such as the channel west of Koh Pich, are not detected and are noted by hand.</li>
          <li>Lengths are great-circle distances along the final geometry. They are indicative and exclude depot access tracks.</li>
        </ul>
        <Note tone="warn">These alignments are preliminary proposals for discussion. They are not approved construction routes and have not been surveyed.</Note>
      </section>
    </ReportPage>
  )
}
