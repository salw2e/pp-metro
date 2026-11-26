import { lines, metroTotals, km, stationById, depots, extensions } from '../data/network'
import { useLang } from '../i18n'
import { Link, href } from '../router'
import { LineMark, Stat, SectionTitle, Note } from '../components/ui'
import { Cite } from '../components/Cite'
import { lazy, Suspense } from 'react'

const PreviewMap = lazy(() => import('../map/PreviewMap').then(m => ({ default: m.PreviewMap })))
import { scenarioTotals, bn } from '../lib/scenario'

export function SummaryPage() {
  const { t, lang, name, num } = useLang()
  const m = metroTotals()
  const cost = scenarioTotals()
  const rail = lines.find(l => l.id === 'L5')!
  const kmText = lang === 'km'

  return (
    <div className="mx-auto max-w-[1440px] px-4 lg:px-6 py-8">
      <div className="border-b border-line pb-4 mb-6">
        <p className="text-[12.5px] uppercase tracking-wide text-muted">{kmText ? 'សំណើបឋមឯករាជ្យ · វិច្ឆិកា ២០២៦' : 'Independent preliminary proposal · November 2026'}</p>
        <h1 className="text-[24px] leading-tight font-semibold text-navy-900 mt-1">{t('nav.summary')}</h1>
        <p className="mt-2 text-muted max-w-[90ch]">
          {kmText
            ? 'ឯកសារនេះស្នើបណ្តាញផ្លូវដែកក្នុងទីក្រុងចំនួនបួនខ្សែ និងសេវារថភ្លើងធ្វើដំណើរប្រចាំថ្ងៃមួយខ្សែលើផ្លូវដែកមានស្រាប់ សម្រាប់ការពិភាក្សាអំពីការអភិវឌ្ឍរាជធានីភ្នំពេញដល់ឆ្នាំ២០៥០។ វាជាការរួមចំណែកគំនិតរបស់ពលរដ្ឋ មិនមែនជាផែនការរបស់រាជរដ្ឋាភិបាល ឬជាការជំនួសការសិក្សាលទ្ធភាពផ្លូវការនោះទេ។'
            : 'This proposal sets out four metro lines and one commuter service on the existing railway for discussion of Phnom Penh\'s development to 2050. It is a citizen\'s contribution of ideas. It is not a government plan and does not replace the official feasibility study.'}
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6 mb-8">
        <Stat value={`${km(m.length)} km`} label={kmText ? 'ខ្សែរថភ្លើងថ្មី (ខ្សែ ១ ដល់ ៤)' : 'New metro lines 1 to 4'} />
        <Stat value={`${km(m.underground)} km`} label={kmText ? 'ក្រោមដី' : 'Underground'} />
        <Stat value={num(m.stations)} label={kmText ? 'ស្ថានីយ៍រថភ្លើងថ្មី' : 'Metro stations'} sub={kmText ? `${num(m.interchanges)} ស្ថានីយ៍ប្តូរខ្សែ` : `${m.interchanges} interchanges`} />
        <Stat value={`${km(rail.lengthM)} km`} label={kmText ? 'រថភ្លើងលើផ្លូវដែកមានស្រាប់' : 'Commuter rail on existing track'} />
        <Stat value={`${bn(cost.low.real)} ${kmText ? 'ដល់' : 'to'} ${bn(cost.high.real)}`} label={kmText ? 'ប៉ាន់ស្មានតម្លៃ (ពាន់លានដុល្លារ តម្លៃឆ្នាំ២០២៦)' : 'Capital cost, US$ bn (2026 prices)'} sub={kmText ? 'ការប៉ាន់ស្មានបឋម' : `Base case ${bn(cost.base.real)}; preliminary`} />
        <Stat value="2050" label={kmText ? 'ឆ្នាំគោលដៅនៃសេណារីយ៉ូ' : 'Scenario horizon'} sub={kmText ? 'មិនមែនជាការប្តេជ្ញាផ្លូវការ' : 'Conditional, not a commitment'} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 prose-report max-w-none">
          <h2 className="!mt-0">{kmText ? 'ស្ថានភាពនៃផែនការផ្លូវការ' : 'Status of official planning'}</h2>
          {kmText && <p className="text-muted text-[13.5px]">{t('common.englishOnly')}</p>}
          <p>
            No metro, light rail or tram line in Phnom Penh is approved, funded or under construction as of November 2026. The 2014 JICA Urban Transport
            Master Plan proposed rail transit on the city's main corridors, underground inside the Inner Ring Road and elevated outside it <Cite ids={['R1', 'R2']} />.
            Its automated guideway transit (AGT) line was suspended after the feasibility study, mainly for financial reasons, and the master plan was never formally
            approved <Cite ids={['R4']} />.
          </p>
          <p>
            The current official track is a metro study by the Ministry of Public Works and Transport with the Asian Infrastructure Investment Bank, agreed in
            September 2024 <Cite ids={['R5']} />. Reports of the preliminary study describe four lines of 16 to 29 km each <Cite ids={['R6']} />, and the full feasibility study is
            due in 2027 with no cost or construction date set <Cite ids={['R7']} />. In July 2026 the Prime Minister said the country is not yet at the stage for an underground
            metro and placed priority on faster buses <Cite ids={['R8']} />.
          </p>
          <p>
            This proposal is therefore offered as a long-range reference for 2050: a way to protect corridors, station sites and depot land now, so that
            the network can be built in stages when demand, finance and institutions allow. It is designed to be checked against, and to give way to, the
            results of the official study.
          </p>
        </div>
        <Suspense fallback={<div className="border border-line bg-panel" style={{ height: 420 }} />}><PreviewMap height={420} /></Suspense>
      </div>

      <SectionTitle>{kmText ? 'បណ្តាញដែលបានស្នើ' : 'Proposed network'}</SectionTitle>
      <div className="overflow-x-auto border border-line">
        <table className="tbl min-w-[860px]">
          <thead>
            <tr>
              <th>{t('dir.line')}</th>
              <th>{kmText ? 'ផ្លូវ' : 'Route'}</th>
              <th className="num">{t('common.length')} (km)</th>
              <th className="num">{t('type.underground')}</th>
              <th className="num">{t('type.elevated')}</th>
              <th className="num">{t('type.surface')}</th>
              <th className="num">{t('common.stations')}</th>
              <th>{kmText ? 'ដំណាក់កាល' : 'Phase'}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => (
              <tr key={l.id}>
                <td><Link to={href('lines') + `#${l.id}`} className="hover:underline"><LineMark id={l.id} withName /></Link></td>
                <td>{name(stationById.get(l.stations[0])!)} to {name(stationById.get(l.stations[l.stations.length - 1])!)}</td>
                <td className="num">{km(l.lengthM)}</td>
                <td className="num">{km(l.byType.underground)}</td>
                <td className="num">{km(l.byType.elevated)}</td>
                <td className="num">{km(l.byType.surface)}</td>
                <td className="num">{l.stations.length}</td>
                <td>{l.phase}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[13px] text-muted mt-2">
        Lengths are measured from the routed geometry. Interchange stations appear once per line in the station counts above; the new metro lines have {m.stations} distinct stations.
        {' '}{extensions.length} future extensions and {depots.length} candidate depot sites are shown on the map.
      </p>

      <div className="grid gap-8 lg:grid-cols-2 mt-2">
        <div className="prose-report max-w-none">
          <h2>Recommendations</h2>
          <ol>
            <li>Protect the corridors of Lines 1 and 2 and the station sites at Central Market, Preah Sihanouk, Boeng Keng Kang and Kbal Thnal in the land use plan, before further development makes them costly to secure.</li>
            <li>Start a household travel survey and a citywide travel demand model, shared with the official feasibility study, so that line priorities rest on measured demand.</li>
            <li>Run a geotechnical and groundwater campaign along the proposed underground sections and both river crossings before route selection.</li>
            <li>Test a commuter service on the existing railway (Line 5) as an early, low-cost step, as the 2014 master plan also proposed <Cite ids={['R2']} />.</li>
            <li>Plan bus priority corridors on the same alignments, so that buses build ridership now and feed the rail stations later.</li>
            <li>Secure candidate depot land at Kandal Stueng, Chom Chao and Sen Sok, which is the hardest land to find once a city has grown around it.</li>
          </ol>
        </div>
        <div className="prose-report max-w-none">
          <h2>Main challenges</h2>
          <ul>
            <li>Soft alluvial ground and a seasonally high water table under the city centre <Cite ids={['R23', 'R24']} />.</li>
            <li>Two river tunnels: under the Tonle Sap to Chroy Changvar and under the Bassac to Chbar Ampov.</li>
            <li>Heritage settings at Wat Phnom, the Royal Palace area and the Independence Monument.</li>
            <li>Cost: regional metros have cost from about US$70 million per km for elevated lines to over US$300 million per km for underground lines (see Financial Assessment).</li>
            <li>The 2014 AGT was suspended for financial reasons <Cite ids={['R4']} />. Any network needs a funding model that the public budget can carry.</li>
          </ul>
          <Note>
            Every alignment, station position, cost and date on this site is preliminary. Coordinates come from a desk study on OpenStreetMap data and have not been
            checked on site. See <Link to={href('references')} className="text-accent underline">Research and References</Link> for sources and data gaps.
          </Note>
        </div>
      </div>
    </div>
  )
}
