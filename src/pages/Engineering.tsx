import { useLang } from '../i18n'
import { ReportPage } from '../components/Layout'
import { Note, SectionTitle } from '../components/ui'
import { Cite } from '../components/Cite'
import { DIAGRAMS } from '../diagrams/Diagrams'
import { lines, stations, stationById } from '../data/network'

export function EngineeringPage() {
  const { t, name } = useLang()
  const crossings = lines.flatMap(l => l.riverCrossings.map(c => ({ l, c })))
  const heritage = stations.filter(s => s.flags.heritage)
  const nearRiver = stations.filter(s => s.flags.nearRiver)
  const onCurve = stations.filter(s => s.flags.platformOnCurve.length)
  return (
    <ReportPage
      title={t('nav.engineering')}
      lead="Engineering considerations for a preliminary proposal. No site investigation has been carried out for this proposal; the conditions described below come from published general sources and must be confirmed along each alignment."
    >
      <Note tone="warn">
        The diagrams on this page are conceptual illustrations prepared for discussion. They are not certified engineering drawings, are not to scale,
        and show typical dimension ranges rather than design values.
      </Note>

      <div className="prose-report max-w-[90ch]">
        <h2>Ground and groundwater</h2>
        <p>
          Phnom Penh stands on river-deposited (alluvial) soils at the confluence of the Mekong, Tonle Sap and Bassac. A JICA borehole reported for the flood
          protection project found clayey sand or sandy silt with low strength to about 28 m below datum before a hard layer <Cite ids={['R23']} />. This is a single
          borehole and is not representative of any alignment. A citywide study compiled 1,200 borehole reports into a subsoil model <Cite ids={['R24']} />; that dataset, the
          Department of Public Works archive and new boreholes along each corridor are the basis for any design.
        </p>
        <p>
          For tunnels and deep station boxes in soft, water-bearing ground, the usual approach is closed-face tunnel boring machines, diaphragm walls for station
          boxes, controlled dewatering or ground treatment, and settlement monitoring of buildings and roads above. Depth, wall type and tunnel method can only be
          chosen once ground conditions are known.
        </p>

        <h2>Flood exposure</h2>
        <p>
          River levels vary by several metres each year. The Tonle Sap at Chaktomuk typically ranges between about EL +1 m and +9 m, with a recorded peak of EL +10.18 m
          on 20 September 2000 <Cite ids={['R23']} />. Basin-wide floods such as those of 2011 affected much of Cambodia <Cite ids={['R25']} />. Underground stations therefore need entrances
          and ventilation openings above a design flood level set by hydrological study, flood gates at entrances and portals, pumped drainage with back-up power, and
          operating procedures tied to flood warnings. Elevated sections need foundations and finished levels that allow for the same flood levels.
        </p>
        <p>{nearRiver.length} proposed stations lie within about 300 m of a river polygon: {nearRiver.map(s => name(s)).join(', ')}.</p>

        <h2>River crossings</h2>
        <p>The crossings below were found by intersecting each alignment with OpenStreetMap river polygons <Cite ids={['R29']} />. Lengths are measured over mapped water.</p>
      </div>
      <div className="overflow-x-auto border border-line max-w-[90ch] mb-2">
        <table className="tbl min-w-[620px]">
          <thead><tr><th>Line</th><th>River</th><th>Between</th><th>Construction</th><th className="num">Over water</th></tr></thead>
          <tbody>
            {crossings.map(({ l, c }, i) => (
              <tr key={i}>
                <td>{name(l)}</td>
                <td>{c.river}</td>
                <td>{c.between ? `${name(stationById.get(c.between[0])!)} to ${name(stationById.get(c.between[1])!)}` : ''}</td>
                <td>{c.segmentType}</td>
                <td className="num">{c.lengthM} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="prose-report max-w-[90ch]">
        <p>
          Line 3 also passes under the narrow channel between the city bank and Koh Pich, which is not mapped as a water area and so is not listed. The Prek Tnaot
          crossing on Line 1 is on the elevated airport section and needs a bridge, not a tunnel. River tunnels need ground investigation from barges, a scour study,
          and agreement with the river and navigation authorities on depth.
        </p>

        <h2>Foundations, utilities and heritage</h2>
        <ul>
          <li>Buildings along the core boulevards are of varied age and foundation type. A building condition survey and damage assessment is needed for every building within the zone of influence of tunnels and station boxes.</li>
          <li>Water, drainage, power and telecommunications lines run under the main boulevards. Records are incomplete in most cities; ground-penetrating radar and trial pits are needed, and diversions must be programmed before excavation.</li>
          <li>
            {heritage.length} stations have a heritage site or landmark within 300 m: {heritage.map(s => name(s)).join(', ')}. Entrance positions, vibration limits and
            construction methods near Wat Phnom, the Royal Palace and the Independence Monument need agreement with the responsible authorities.
          </li>
          <li>{onCurve.length} stations still sit on a curve in this preliminary geometry ({onCurve.map(s => name(s)).join(', ')}). Their station boxes must move to straight track in design.</li>
        </ul>

        <h2>Investigations required before route selection</h2>
        <ol>
          <li>Boreholes and in-situ tests along each underground section and at each station, with groundwater monitoring through at least one full wet and dry season.</li>
          <li>Hydrological study to set design flood levels for stations, portals and depots.</li>
          <li>Topographic, building condition and utility surveys along the corridors.</li>
          <li>Heritage assessment with the responsible authorities.</li>
          <li>River bathymetry, scour assessment and navigation requirements at both river crossings.</li>
        </ol>
      </div>

      <SectionTitle>Technical diagrams</SectionTitle>
      <div className="grid gap-6 xl:grid-cols-2">
        {DIAGRAMS.map((D, i) => <D key={i} />)}
      </div>
    </ReportPage>
  )
}
