import { useEffect, useState } from 'react'
import { Printer, Download, Map as MapIcon } from 'lucide-react'
import { useLang } from '../i18n'
import { lines, metroTotals, km, stations } from '../data/network'
import { Button, SectionTitle, Note, download, LineMark } from '../components/ui'
import { Cite } from '../components/Cite'
import { REFS } from '../data/references'
import { href } from '../router'
import { buildExport, stationsCsv, linesCsv } from '../lib/exports'
import { scenarioTotals, bn } from '../lib/scenario'

type Author = { name: string; role: string; phone: string; email: string; address: string; date: string }
const EMPTY: Author = { name: '', role: '', phone: '', email: '', address: '', date: '' }

const toKhmerDigits = (s: string | number) => String(s).replace(/[0-9]/g, d => '០១២៣៤៥៦៧៨៩'[+d])

function Blank({ v, w = 'w-48' }: { v: string; w?: string }) {
  return v ? <span>{v}</span> : <span className={`inline-block ${w} border-b border-dotted border-ink align-bottom`}>&nbsp;</span>
}

export function SubmissionPage() {
  const { t } = useLang()
  const [a, setA] = useState<Author>(() => {
    try { return { ...EMPTY, ...JSON.parse(localStorage.getItem('author') ?? '{}') } } catch { return EMPTY }
  })
  useEffect(() => { try { localStorage.setItem('author', JSON.stringify(a)) } catch { /* private mode */ } }, [a])
  const m = metroTotals()
  const cost = scenarioTotals()
  const totalKm = km(m.length, 0)
  const field = (k: keyof Author, label: string, type = 'text') => (
    <div>
      <label htmlFor={`a-${k}`} className="block text-[12.5px] text-muted mb-1">{label}</label>
      <input id={`a-${k}`} type={type} value={a[k]} onChange={e => setA(v => ({ ...v, [k]: e.target.value }))} className="w-full h-9 px-2 border border-line-strong rounded-sm" />
    </div>
  )

  return (
    <div className="mx-auto max-w-[1100px] px-4 lg:px-6 py-8">
      <div className="no-print border-b border-line pb-4 mb-6">
        <h1 className="text-[24px] leading-tight font-semibold text-navy-900">{t('nav.submission')}</h1>
        <p className="mt-2 text-muted max-w-[80ch]">
          Formal submission package: a Khmer covering letter with an English translation, the executive summary, and downloadable data. Fill in the author details;
          they are kept only in this browser and appear in the printed letter.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
          {field('name', 'Author name')}
          {field('role', 'Occupation or organisation')}
          {field('phone', 'Telephone', 'tel')}
          {field('email', 'Email', 'email')}
          {field('address', 'Address')}
          {field('date', 'Submission date', 'date')}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="primary" onClick={() => print()}><Printer size={15} aria-hidden="true" />{t('common.print')} A4</Button>
          <Button onClick={() => window.open(href('print-map'), '_blank')}><MapIcon size={15} aria-hidden="true" />A3 network map</Button>
          <Button onClick={() => download('phnom-penh-rail-2050-network.geojson', JSON.stringify(buildExport(), null, 1), 'application/geo+json')}><Download size={15} aria-hidden="true" />GeoJSON</Button>
          <Button onClick={() => download('phnom-penh-rail-2050-stations.csv', stationsCsv(), 'text/csv;charset=utf-8')}><Download size={15} aria-hidden="true" />Stations CSV</Button>
          <Button onClick={() => download('phnom-penh-rail-2050-lines.csv', linesCsv(), 'text/csv;charset=utf-8')}><Download size={15} aria-hidden="true" />Lines CSV</Button>
        </div>
        <Note>
          The Khmer letter was drafted for this proposal and should be reviewed by a native speaker familiar with official correspondence before it is sent.
          The package uses no government seal or emblem and does not imply endorsement by any authority.
        </Note>
      </div>

      {/* Khmer letter */}
      <article lang="km" className="font-khmer border border-line p-6 sm:p-10 bg-white text-[15.5px] leading-[2] avoid-break" aria-label="Khmer letter">
        <div className="text-center font-semibold leading-[1.9]">
          <div>ព្រះរាជាណាចក្រកម្ពុជា</div>
          <div>ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        </div>
        <div className="mt-6 text-[14.5px]">
          <div><Blank v={a.name} /></div>
          <div><Blank v={a.role} /></div>
          <div>{a.phone && <>ទូរស័ព្ទ៖ {a.phone}</>} {a.email && <>អ៊ីមែល៖ {a.email}</>}</div>
          <div><Blank v={a.address} w="w-64" /></div>
        </div>
        <p className="text-right mt-4">
          រាជធានីភ្នំពេញ ថ្ងៃទី{a.date ? toKhmerDigits(+a.date.slice(8, 10)) : '.....'} ខែ{a.date ? ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'][+a.date.slice(5, 7) - 1] : '.....'} ឆ្នាំ{a.date ? toKhmerDigits(a.date.slice(0, 4)) : '២០២៦'}
        </p>
        <div className="text-center font-semibold mt-4">
          <div>សូមគោរពជូន</div>
          <div>សម្តេចមហាបវរធិបតី ហ៊ុន ម៉ាណែត</div>
          <div>នាយករដ្ឋមន្ត្រីនៃព្រះរាជាណាចក្រកម្ពុជា</div>
        </div>
        <p className="mt-6"><span className="font-semibold">កម្មវត្ថុ៖</span> សំណើឯករាជ្យរបស់ពលរដ្ឋ ស្តីពី «ផែនការមេប្រព័ន្ធផ្លូវដែករាជធានីភ្នំពេញ ឆ្នាំ២០៥០» ដើម្បីរួមចំណែកគំនិតដល់ការរៀបចំផែនការដឹកជញ្ជូនសាធារណៈ។</p>
        <p><span className="font-semibold">យោង៖</span> ការសិក្សាលទ្ធភាពប្រព័ន្ធរថភ្លើងក្នុងរាជធានីភ្នំពេញ ដែលកំពុងអនុវត្តដោយក្រសួងសាធារណការ និងដឹកជញ្ជូន។</p>
        <p className="indent-10 mt-4">
          តបតាមកម្មវត្ថុ និងយោងខាងលើ ខ្ញុំបាទ/នាងខ្ញុំ <Blank v={a.name} /> ជាពលរដ្ឋខ្មែរ សូមគោរពជម្រាបជូនសម្តេចមហាបវរធិបតី មេត្តាជ្រាបថា ខ្ញុំបាទ/នាងខ្ញុំ
          បានរៀបចំសំណើបឋមមួយដោយឯករាជ្យ ស្តីពីបណ្តាញផ្លូវដែកក្នុងរាជធានីភ្នំពេញ ក្នុងគោលបំណងរួមចំណែកគំនិតដល់ដំណើរការរៀបចំផែនការដឹកជញ្ជូនរបស់ព្រះរាជាណាចក្រកម្ពុជា។
        </p>
        <p className="indent-10">
          សំណើនេះរួមមាន ខ្សែរថភ្លើងថ្មីចំនួនបួនខ្សែ ដែលមានប្រវែងសរុបប្រមាណ {toKhmerDigits(totalKm)} គីឡូម៉ែត្រ និងស្ថានីយ៍ចំនួន {toKhmerDigits(m.stations)}
          ព្រមទាំងសេវារថភ្លើងធ្វើដំណើរប្រចាំថ្ងៃលើផ្លូវដែកដែលមានស្រាប់ ដោយភ្ជាប់មជ្ឈមណ្ឌលរាជធានី តំបន់លំនៅដ្ឋាន តំបន់ឧស្សាហកម្ម និងអាកាសយានដ្ឋានអន្តរជាតិតេជោ។
          សំណើនេះក៏មានផែនទីអន្តរកម្ម ការវិភាគបច្ចេកទេសបឋម ការប៉ាន់ស្មានតម្លៃបឋម និងសេណារីយ៉ូនៃការអនុវត្តជាដំណាក់កាលរហូតដល់ឆ្នាំ២០៥០ផងដែរ។
        </p>
        <p className="indent-10">
          ខ្ញុំបាទ/នាងខ្ញុំ សូមបញ្ជាក់ថា ឯកសារនេះជាការសិក្សាលើឯកសារ ដែលផ្អែកលើទិន្នន័យសាធារណៈ ពុំមែនជាផែនការផ្លូវការ ហើយពុំមានគោលបំណងជំនួសការសិក្សាលទ្ធភាព
          ដែលកំពុងអនុវត្តដោយក្រសួងសាធារណការ និងដឹកជញ្ជូនឡើយ។ ខ្សែផ្លូវ ទីតាំងស្ថានីយ៍ តម្លៃ និងកាលបរិច្ឆេទទាំងអស់ គឺជាការប៉ាន់ស្មានបឋម ដែលត្រូវការការសិក្សា
          និងការផ្ទៀងផ្ទាត់បន្ថែមនៅទីតាំងជាក់ស្តែង។
        </p>
        <p className="indent-10">
          ខ្ញុំបាទ/នាងខ្ញុំ សង្ឃឹមថា សំណើនេះអាចជាឯកសារពិគ្រោះដែលមានប្រយោជន៍ ជាពិសេសលើការរក្សាទុកច្រករបៀងផ្លូវ និងដីសម្រាប់ស្ថានីយ៍ និងដេប៉ូនាពេលអនាគត។
          ខ្ញុំបាទ/នាងខ្ញុំ ត្រៀមខ្លួនជានិច្ចក្នុងការផ្តល់ព័ត៌មានបន្ថែម និងធ្វើបទបង្ហាញលម្អិត តាមការចាំបាច់។
        </p>
        <p className="indent-10">អាស្រ័យដូចបានគោរពជម្រាបជូនខាងលើ សូមសម្តេចមហាបវរធិបតី មេត្តាពិនិត្យ និងសម្រេចដោយក្តីអនុគ្រោះ។</p>
        <p className="indent-10">សូមសម្តេចមហាបវរធិបតី មេត្តាទទួលនូវការគោរពដ៏ខ្ពង់ខ្ពស់អំពីខ្ញុំបាទ/នាងខ្ញុំ។</p>
        <div className="mt-8 ml-auto w-64 text-center">
          <div>ហត្ថលេខា</div>
          <div className="h-16" />
          <div><Blank v={a.name} /></div>
        </div>
        <div className="mt-8 text-[14px]">
          <div className="font-semibold">ឯកសារភ្ជាប់៖</div>
          <div>១. របាយការណ៍សង្ខេប (ទំហំ A4)</div>
          <div>២. ផែនទីបណ្តាញ (ទំហំ A3)</div>
          <div>៣. ទិន្នន័យភូមិសាស្ត្រ (GeoJSON និង CSV)</div>
        </div>
      </article>

      {/* English translation */}
      <article className="border border-line p-6 sm:p-10 bg-white mt-6 print-break" aria-label="English translation of the letter">
        <p className="text-[12.5px] uppercase tracking-wide text-muted mb-4">English translation</p>
        <div className="text-center font-semibold"><div>Kingdom of Cambodia</div><div>Nation Religion King</div></div>
        <p className="text-right mt-4">Phnom Penh, {a.date ? new Date(a.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '........ 2026'}</p>
        <p className="mt-4"><strong>To:</strong> Samdech Moha Borvor Thipadei Hun Manet, Prime Minister of the Kingdom of Cambodia</p>
        <p><strong>Subject:</strong> An independent citizen's proposal, "Phnom Penh Metropolitan Rail Master Plan 2050", offered as a contribution to public transport planning.</p>
        <p><strong>Reference:</strong> The Phnom Penh rail feasibility study being carried out by the Ministry of Public Works and Transport.</p>
        <div className="prose-report max-w-none mt-4">
          <p>
            With reference to the above, I, {a.name || '................'}, a Cambodian citizen, respectfully inform Samdech that I have independently prepared a preliminary proposal
            for a rail network in Phnom Penh, with the aim of contributing ideas to Cambodia's transport planning process.
          </p>
          <p>
            The proposal comprises four new rail lines with a total length of about {totalKm} km and {m.stations} stations, together with a commuter service on the existing railway,
            connecting the city centre, residential and industrial areas and Techo International Airport. It also contains an interactive map, a preliminary technical
            analysis, a preliminary cost estimate and a staged implementation scenario to 2050.
          </p>
          <p>
            I wish to make clear that this document is a desk study based on public data. It is not an official plan and is not intended to replace the feasibility study being
            carried out by the Ministry of Public Works and Transport. All alignments, station locations, costs and dates are preliminary estimates that require further study and
            verification on site.
          </p>
          <p>
            I hope that the proposal may be a useful reference, in particular for protecting corridors and land for future stations and depots. I remain ready to provide further
            information or a detailed presentation if required.
          </p>
          <p>I respectfully request that Samdech kindly consider this proposal, and I beg Samdech to accept the assurance of my highest respect.</p>
          <p>Attachments: 1. Summary report (A4); 2. Network map (A3); 3. Geographic data (GeoJSON and CSV).</p>
        </div>
      </article>

      <section className="print-break">
        <SectionTitle>Proposal objectives</SectionTitle>
        <ul className="list-disc pl-5 space-y-1 max-w-[90ch]">
          <li>Offer a citywide reference network that protects rail corridors, station sites and depot land while development continues.</li>
          <li>Connect the city centre with the main residential, employment and growth areas and with Techo International Airport.</li>
          <li>Show which sections suit underground, elevated or surface construction, and the main engineering risks.</li>
          <li>Give a transparent, adjustable cost estimate and a staged programme that can be tested against the official feasibility study.</li>
        </ul>

        <SectionTitle>Executive recommendations</SectionTitle>
        <ol className="list-decimal pl-5 space-y-1 max-w-[90ch]">
          <li>Protect the Line 1 and Line 2 corridors and the central interchange sites in the land use plan.</li>
          <li>Commission a household travel survey and demand model, shared with the official study.</li>
          <li>Start geotechnical, groundwater and hydrological investigations on the underground sections and river crossings.</li>
          <li>Pilot a commuter service on the existing railway as an early, low-cost step <Cite ids={['R2']} />.</li>
          <li>Develop bus priority on the same corridors to build ridership before rail opens <Cite ids={['R8']} />.</li>
          <li>Secure candidate depot land early.</li>
        </ol>

        <SectionTitle>Proposed network</SectionTitle>
        <div className="overflow-x-auto border border-line">
          <table className="tbl min-w-[640px]">
            <thead><tr><th>Line</th><th className="num">km</th><th className="num">Underground</th><th className="num">Elevated</th><th className="num">Surface</th><th className="num">Stations</th></tr></thead>
            <tbody>{lines.map(l => <tr key={l.id}><td><LineMark id={l.id} withName /></td><td className="num">{km(l.lengthM)}</td><td className="num">{km(l.byType.underground)}</td><td className="num">{km(l.byType.elevated)}</td><td className="num">{km(l.byType.surface)}</td><td className="num">{l.stations.length}</td></tr>)}</tbody>
          </table>
        </div>

        <div className="grid gap-8 md:grid-cols-2 mt-2">
          <div>
            <SectionTitle>Potential public benefits</SectionTitle>
            <ul className="list-disc pl-5 space-y-1">
              <li>Reliable journey times that do not depend on road congestion.</li>
              <li>A direct rail link between the city centre and Techo International Airport.</li>
              <li>Access to jobs from the industrial southwest and the growing north and east.</li>
              <li>Step-free, safe public transport for older people, people with disabilities and children.</li>
              <li>Lower street-level emissions where trips move from motor vehicles; the size of this benefit needs a demand model.</li>
            </ul>
          </div>
          <div>
            <SectionTitle>Main engineering challenges</SectionTitle>
            <ul className="list-disc pl-5 space-y-1">
              <li>Soft alluvial ground and a seasonally high water table <Cite ids={['R23', 'R24']} />.</li>
              <li>Tunnels under the Tonle Sap and the Bassac.</li>
              <li>Flood protection of underground stations <Cite ids={['R23']} />.</li>
              <li>Heritage settings in the historic centre.</li>
              <li>Utilities and building foundations along the core boulevards.</li>
            </ul>
          </div>
        </div>

        <SectionTitle>Financial considerations</SectionTitle>
        <p className="max-w-[90ch]">
          The preliminary estimate for the four new lines, the commuter rail upgrade, trains and depots is about US${bn(cost.low.real)} billion to US${bn(cost.high.real)} billion at
          2026 prices (base case US${bn(cost.base.real)} billion), before escalation. These figures rest on stated assumptions, not quotations. The 2014 AGT line was suspended mainly
          for financial reasons <Cite ids={['R4']} />, so a realistic plan needs staged construction, concessional finance and land value capture, and should expect public support for operation.
        </p>

        <SectionTitle>Methodology and limitations</SectionTitle>
        <ul className="list-disc pl-5 space-y-1 max-w-[90ch]">
          <li>Alignments were routed on OpenStreetMap road and railway geometry, smoothed with circular curves, and checked for curve radius, station spacing, river crossings and platform straightness <Cite ids={['R29']} />.</li>
          <li>Station positions ({stations.length} in total) are desk-study coordinates and have not been visited, surveyed or checked against land records.</li>
          <li>No travel demand model, ridership forecast, ground investigation or environmental baseline exists for this proposal.</li>
          <li>Costs use assumed unit rates set against published regional projects; they are indicative only.</li>
          <li>All dates are a conditional scenario, not a commitment.</li>
          <li>The proposal was prepared without access to the MPWT and AIIB study, whose line routes have not been published.</li>
        </ul>

        <SectionTitle>Research references</SectionTitle>
        <ol className="list-none p-0 text-[13px] space-y-1 max-w-[100ch]">
          {REFS.map(r => <li key={r.id}><span className="font-mono text-muted mr-2">{r.id}</span>{r.publisher}, {r.date}. {r.title}. <span className="break-all text-muted">{r.url}</span></li>)}
        </ol>
      </section>
    </div>
  )
}
