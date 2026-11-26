import { useLang } from '../i18n'
import { ReportPage } from '../components/Layout'
import { Note } from '../components/ui'
import { Cite } from '../components/Cite'
import { depots, stations, lines } from '../data/network'

export function EnvironmentPage() {
  const { t, name } = useLang()
  const heritage = stations.filter(s => s.flags.heritage)
  const elevatedKm = lines.reduce((a, l) => a + l.byType.elevated, 0) / 1000
  return (
    <ReportPage
      title={t('nav.environment')}
      lead="The main environmental and social issues that an impact assessment would need to address. Benefits such as emission savings are not quantified here because they depend on a ridership forecast that does not yet exist."
    >
      <div className="prose-report max-w-[90ch]">
        <h2>Approach</h2>
        <p>
          A project of this size requires a full environmental and social impact assessment under Cambodian law and to the safeguard standards of whichever institution
          finances it. Those standards normally require a baseline survey, analysis of alternatives, a resettlement action plan where people are displaced, meaningful
          consultation with affected people, and a monitoring plan. This page lists the issues that the assessment should cover; it is not itself an assessment.
        </p>

        <h2>Land acquisition and resettlement</h2>
        <ul>
          <li>Running lines follow existing boulevards and national roads, which reduces the land needed. Underground running tunnels need no surface land except at shafts and portals.</li>
          <li>Stations need land for entrances, ventilation and construction worksites; elevated stations need land at footpath level for stairs and lifts.</li>
          <li>The {depots.length} candidate depot sites each need roughly 15 to 30 hectares. Ownership and current use have not been checked.</li>
          <li>Where households or businesses are affected, a resettlement action plan with fair compensation, livelihood restoration and grievance arrangements is required before land is taken.</li>
        </ul>

        <h2>Heritage and the historic centre</h2>
        <p>
          {heritage.length} proposed stations have a heritage site or landmark within 300 m ({heritage.map(s => name(s)).join(', ')}). Station entrances, ventilation
          shafts and construction worksites near Wat Phnom, the Royal Palace, the National Museum and the Independence Monument must be placed and designed with the
          responsible authorities. Tunnelling under or near historic buildings requires condition surveys, vibration limits and monitoring.
        </p>

        <h2>Construction impacts</h2>
        <ul>
          <li><strong>Traffic.</strong> Station boxes in boulevards close lanes for several years. Construction should be staged, with diversions and bus priority planned in advance.</li>
          <li><strong>Noise, vibration and dust.</strong> Limits on working hours near homes, schools and hospitals; monitoring at sensitive buildings.</li>
          <li><strong>Settlement.</strong> Tunnelling and dewatering in soft ground can cause settlement; buildings in the zone of influence need surveys before, during and after works.</li>
          <li><strong>Spoil.</strong> Tunnels and station boxes produce large volumes of excavated material that must be transported and disposed of or reused without filling wetlands or drainage areas.</li>
          <li><strong>Water.</strong> Dewatering, construction runoff and any work near the rivers must avoid polluting surface water and must not block drainage during the wet season <Cite ids={['R23']} />.</li>
        </ul>

        <h2>Operation</h2>
        <ul>
          <li>About {elevatedKm.toFixed(0)} km of elevated line will change the view and light along the corridors and bring noise from trains above street level. Noise barriers and careful design of viaducts and stations reduce this.</li>
          <li>Electric trains produce no exhaust at street level. Whether the network reduces citywide emissions and congestion depends on how many trips move from cars and motorcycles, which needs a demand model.</li>
          <li>Stations will raise land values and attract development. Without planning controls this can displace lower-income residents; value capture can fund affordable housing and public space.</li>
        </ul>

        <h2>Social inclusion</h2>
        <ul>
          <li><strong>Access for all.</strong> Step-free access, tactile guidance, accessible ticketing and clear Khmer and English signage at every station.</li>
          <li><strong>Safety and gender.</strong> Lit, visible station approaches, staffed stations and safe walking routes, informed by consultation with women and girls who travel at night.</li>
          <li><strong>Affordability.</strong> Fares and transfers set so that the people who most need public transport can use it, integrated with City Bus fares.</li>
          <li><strong>Livelihoods.</strong> Tuk-tuk, motorcycle taxi and bus drivers and street vendors near stations will be affected. Feeder services and planned spaces for vendors can turn competition into connection.</li>
        </ul>

        <h2>Consultation</h2>
        <p>
          Consultation should begin at corridor stage, before alignments are fixed, with affected households and businesses, commune and district authorities, heritage
          authorities, transport operators, disability organisations and the public. Information should be published in Khmer, with maps that people can understand.
        </p>

        <Note>
          Policy context: the city's Sustainable City Plan and Land Use Master Plan 2035 both bear on corridor and station planning <Cite ids={['R27', 'R28']} />. The 2014 master plan set a target
          of more than 30% public transport share by 2035 <Cite ids={['R1']} />.
        </Note>
      </div>
    </ReportPage>
  )
}
