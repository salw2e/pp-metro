import { useEffect } from 'react'
import { useLang } from '../i18n'
import { ReportPage } from '../components/Layout'
import { SectionTitle } from '../components/ui'
import { REFS, type RefStatus } from '../data/references'

const STATUS: Record<RefStatus, string> = {
  primary: 'Official document read directly',
  web: 'Official or reputable web page; re-read before formal citation',
  secondary: 'Secondary report; confirm with the primary source',
}

const GAPS: [string, string][] = [
  ['Routes and lengths of the four lines in the MPWT and AIIB preliminary study', 'Written request to MPWT or the inter-ministerial committee; AIIB terms of reference.'],
  ['The 2019 JICA AGT feasibility report (route of about 19 km, reported cost)', 'JICA Cambodia Office; search the JICA report library in Japanese.'],
  ['Length, cost and route of the Chinese light rail and monorail feasibility studies (2024)', 'Council for the Development of Cambodia or the committee.'],
  ['Any official tram or autonomous rail rapid transit proposal', 'None found. Confirm with MPWT and the Capital Administration.'],
  ['Royal Railway line lengths and current timetable', 'Royal Railway and MPWT; ADB project documents.'],
  ['Status and future use of the former Phnom Penh International Airport site', 'State Secretariat of Civil Aviation.'],
  ['Phnom Penh to Techo airport expressway: length and status', 'MPWT.'],
  ['Population projections for Phnom Penh after 2019', 'National Institute of Statistics population projection report.'],
  ['Sub-decree number and date of the Land Use Master Plan 2035', 'Official Khmer text from the Council of Ministers.'],
  ['Opening dates and all-in cost of the KL Putrajaya Line', 'MRT Corp annual reports.'],
  ['Bangkok MRT Blue Line extension costs', 'MRTA and JICA evaluation reports.'],
  ['Phnom Penh river levels in the 2011 and 2013 floods', 'Mekong River Commission flood reports; MOWRAM gauge records.'],
  ['Groundwater depth and soft-clay thickness along each corridor', 'Department of Public Works borehole archive; Touch et al. (2014); new boreholes.'],
  ['Station-level population and employment catchments', 'Census enumeration areas, building footprints and a travel survey.'],
  ['City Bus routes and stops near each station', 'Phnom Penh City Bus Authority route data.'],
]

export function ReferencesPage() {
  const { t } = useLang()
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView()
  }, [])
  return (
    <ReportPage
      title={t('nav.references')}
      lead="Sources used in this proposal, checked in November 2026. Each entry shows what it was used for and how reliable the check was. No figure on this site is taken from an unlisted source."
    >
      <ol className="m-0 p-0 list-none border-t border-line">
        {REFS.map(r => (
          <li key={r.id} id={r.id} className="scroll-mt-28 grid gap-1 md:grid-cols-[64px_minmax(0,1fr)_260px] md:gap-4 py-3 border-b border-line target:bg-navy-50">
            <span className="font-mono text-[13px] text-muted">{r.id}</span>
            <div className="min-w-0">
              <a href={r.url} className="text-accent underline underline-offset-2 break-words" rel="noreferrer" target="_blank">{r.title}</a>
              <div className="text-[13px] text-muted">{r.publisher}, {r.date}</div>
              <div className="text-[13.5px] mt-1">{r.used}</div>
            </div>
            <div className="text-[12.5px] text-muted md:text-right">{STATUS[r.status]}</div>
          </li>
        ))}
      </ol>

      <SectionTitle>Data gaps and how to fill them</SectionTitle>
      <div className="overflow-x-auto border border-line">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>Information not available or not verified</th><th>How it should be collected</th></tr></thead>
          <tbody>{GAPS.map(([a, b]) => <tr key={a}><td>{a}</td><td>{b}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="prose-report max-w-[90ch]">
        <h2>Geographic data and licences</h2>
        <ul>
          <li>Roads, railways, rivers, bridges, district boundaries and landmarks: OpenStreetMap contributors, retrieved through the Overpass API on 26 November 2026, licensed under the Open Database Licence (ODbL 1.0). The extract and the scripts that produce the network are in the source repository.</li>
          <li>District populations: 2019 General Population Census, Table P-12 (household population by khan).</li>
          <li>Base maps: OpenFreeMap vector tiles built from OpenMapTiles and OpenStreetMap; satellite imagery from Esri World Imagery, displayed with the attribution Esri requires. Operators of this site must confirm that their use complies with each provider's terms.</li>
          <li>All coordinates are WGS 84 (EPSG:4326). Lengths are great-circle distances.</li>
        </ul>
      </div>
    </ReportPage>
  )
}
