import type { ReactNode } from 'react'
import { lines } from '../data/network'

const tonleSap = lines.flatMap(l => l.riverCrossings).find(c => c.river === 'Tonle Sap River')

// Conceptual diagrams in one drawing style. Not to scale; dimensions are typical ranges, not design values.
const INK = '#1b2430'
const CONCRETE = '#d9dde3'
const SOIL = '#efe6d6'
const WATER = '#cfe3f5'
const MUTED = '#5d6877'

function Defs() {
  return (
    <defs>
      <pattern id="soil" width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill={SOIL} />
        <path d="M0 8 L8 0" stroke="#d2c2a4" strokeWidth="0.8" />
      </pattern>
      <pattern id="rock" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#e3ddd2" />
        <circle cx="3" cy="3" r="1" fill="#bfb29b" />
        <circle cx="8" cy="7" r="1.2" fill="#bfb29b" />
      </pattern>
      <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={INK} />
      </marker>
      <marker id="arrowAir" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="#2f7fd1" />
      </marker>
      <marker id="arrowExit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="#1d7a3a" />
      </marker>
    </defs>
  )
}

const T = ({ x, y, children, anchor = 'start', size = 11, fill = INK, weight = 400 }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number; fill?: string; weight?: number }) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={fill} fontWeight={weight} fontFamily="IBM Plex Sans, sans-serif">{children}</text>
)

/** Horizontal dimension line with a label. */
const DimH = ({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) => (
  <g>
    <line x1={x1} x2={x2} y1={y} y2={y} stroke={INK} strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
    <T x={(x1 + x2) / 2} y={y - 4} anchor="middle" size={10}>{label}</T>
  </g>
)
const DimV = ({ x, y1, y2, label, side = 'right' }: { x: number; y1: number; y2: number; label: string; side?: 'left' | 'right' }) => (
  <g>
    <line x1={x} x2={x} y1={y1} y2={y2} stroke={INK} strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
    <T x={side === 'right' ? x + 5 : x - 5} y={(y1 + y2) / 2 + 3} anchor={side === 'right' ? 'start' : 'end'} size={10}>{label}</T>
  </g>
)

/** A simplified train cross-section. */
const TrainSection = ({ cx, base, w = 56, h = 66 }: { cx: number; base: number; w?: number; h?: number }) => (
  <g>
    <rect x={cx - w / 2} y={base - h} width={w} height={h - 8} rx={6} fill="#fff" stroke={INK} strokeWidth={1.2} />
    <rect x={cx - w / 2 + 8} y={base - h + 12} width={w - 16} height={14} fill="#e6ecf5" stroke={INK} strokeWidth={0.6} />
    <line x1={cx - 18} x2={cx + 18} y1={base} y2={base} stroke={INK} strokeWidth={3} />
    <circle cx={cx - 14} cy={base - 5} r={4} fill={INK} />
    <circle cx={cx + 14} cy={base - 5} r={4} fill={INK} />
  </g>
)

export function Frame({ title, n, children, caption }: { title: string; n: number; children: ReactNode; caption: string }) {
  return (
    <figure className="m-0 border border-line bg-white avoid-break">
      <svg viewBox="0 0 640 380" className="w-full h-auto block" role="img" aria-label={title}>
        <Defs />
        <rect x={0.5} y={0.5} width={639} height={379} fill="#fff" stroke={CONCRETE} />
        {children}
        <g>
          <rect x={0.5} y={346} width={639} height={33.5} fill="#f6f7f9" stroke={CONCRETE} />
          <T x={12} y={360} size={11} weight={600}>{`Figure ${n}. ${title}`}</T>
          <T x={12} y={374} size={9.5} fill={MUTED}>Conceptual diagram, not to scale. Not an engineering drawing.</T>
        </g>
      </svg>
      <figcaption className="px-4 py-3 text-[13.5px] border-t border-line">{caption}</figcaption>
    </figure>
  )
}

export function TwinBore() {
  return (
    <Frame n={1} title="Underground twin-bore running tunnels" caption="Two single-track tunnels, typically 5.5 to 6.5 m internal diameter, lined with precast concrete segments. Cross-passages link the bores at intervals for evacuation. Cover above the crown is set by ground conditions, buildings and utilities; in soft ground it is commonly at least one tunnel diameter.">
      <rect x={0} y={60} width={640} height={286} fill="url(#soil)" />
      <rect x={0} y={44} width={640} height={16} fill="#9aa3ae" />
      <T x={12} y={38} size={11}>Street level, boulevard carriageway</T>
      <line x1={0} x2={640} y1={120} y2={120} stroke="#2f7fd1" strokeDasharray="6 4" />
      <T x={12} y={114} size={10} fill="#2f7fd1">Groundwater level (varies seasonally)</T>
      {[200, 440].map(cx => (
        <g key={cx}>
          <circle cx={cx} cy={240} r={78} fill={CONCRETE} stroke={INK} strokeWidth={1.5} />
          <circle cx={cx} cy={240} r={66} fill="#fff" stroke={INK} strokeWidth={1} />
          <rect x={cx - 52} y={270} width={104} height={14} fill={CONCRETE} stroke={INK} strokeWidth={0.8} />
          <TrainSection cx={cx} base={270} w={70} h={92} />
        </g>
      ))}
      <rect x={278} y={232} width={84} height={20} fill="#fff" stroke={INK} strokeWidth={1} />
      <T x={320} y={246} anchor="middle" size={9.5}>cross-passage</T>
      <DimH x1={134} x2={266} y={330} label="5.5 to 6.5 m internal" />
      <DimV x={540} y1={60} y2={162} label="cover" />
      <T x={548} y={124} size={10}>at least one diameter</T>
      <T x={200} y={152} anchor="middle" size={10}>segmental lining</T>
    </Frame>
  )
}

export function IslandPlatform() {
  return (
    <Frame n={2} title="Underground station with an island platform" caption="One central platform between the two tracks. Built in a box excavated from the surface between diaphragm walls (cut-and-cover or top-down). Suits stations where the tunnels can spread apart, and lets passengers change direction on one platform.">
      <rect x={0} y={60} width={640} height={286} fill="url(#soil)" />
      <rect x={0} y={44} width={640} height={16} fill="#9aa3ae" />
      <rect x={110} y={60} width={420} height={250} fill={CONCRETE} stroke={INK} strokeWidth={1.5} />
      <rect x={124} y={74} width={392} height={222} fill="#fff" stroke={INK} />
      <line x1={124} x2={516} y1={160} y2={160} stroke={INK} strokeWidth={2} />
      <T x={320} y={120} anchor="middle" size={11}>Concourse: ticket gates, lifts, stairs, plant rooms</T>
      <rect x={270} y={246} width={100} height={12} fill={CONCRETE} stroke={INK} />
      <T x={320} y={286} anchor="middle" size={10}>island platform</T>
      <TrainSection cx={205} base={276} w={66} h={86} />
      <TrainSection cx={435} base={276} w={66} h={86} />
      <rect x={302} y={160} width={36} height={86} fill="none" stroke={MUTED} strokeDasharray="3 3" />
      <T x={320} y={208} anchor="middle" size={9} fill={MUTED}>lift</T>
      <line x1={104} x2={104} y1={60} y2={330} stroke={INK} strokeWidth={4} />
      <line x1={536} x2={536} y1={60} y2={330} stroke={INK} strokeWidth={4} />
      <T x={98} y={340} anchor="end" size={10}>diaphragm wall</T>
      <DimH x1={110} x2={530} y={30} label="box width typically 20 to 25 m" />
      <DimV x={560} y1={60} y2={296} label="" />
      <T x={566} y={180} size={10}>15 to 25 m</T>
      <T x={566} y={193} size={10}>deep</T>
    </Frame>
  )
}

export function SidePlatform() {
  return (
    <Frame n={3} title="Underground station with side platforms" caption="Two platforms outside the tracks, which can continue straight from the running tunnels. Narrower than an island station in some layouts but needs a concourse above to connect both sides.">
      <rect x={0} y={60} width={640} height={286} fill="url(#soil)" />
      <rect x={0} y={44} width={640} height={16} fill="#9aa3ae" />
      <rect x={110} y={60} width={420} height={250} fill={CONCRETE} stroke={INK} strokeWidth={1.5} />
      <rect x={124} y={74} width={392} height={222} fill="#fff" stroke={INK} />
      <line x1={124} x2={516} y1={160} y2={160} stroke={INK} strokeWidth={2} />
      <T x={320} y={120} anchor="middle" size={11}>Concourse linking both platforms</T>
      <rect x={128} y={246} width={84} height={12} fill={CONCRETE} stroke={INK} />
      <rect x={428} y={246} width={84} height={12} fill={CONCRETE} stroke={INK} />
      <T x={170} y={240} anchor="middle" size={10}>platform</T>
      <T x={470} y={240} anchor="middle" size={10}>platform</T>
      <TrainSection cx={270} base={276} w={66} h={86} />
      <TrainSection cx={370} base={276} w={66} h={86} />
      <rect x={136} y={160} width={30} height={86} fill="none" stroke={MUTED} strokeDasharray="3 3" />
      <rect x={474} y={160} width={30} height={86} fill="none" stroke={MUTED} strokeDasharray="3 3" />
      <T x={151} y={208} anchor="middle" size={9} fill={MUTED}>lift</T>
      <T x={489} y={208} anchor="middle" size={9} fill={MUTED}>lift</T>
      <T x={320} y={330} anchor="middle" size={10}>platform screen doors at both platform edges</T>
    </Frame>
  )
}

export function ElevatedStation() {
  return (
    <Frame n={4} title="Elevated station over a boulevard" caption="Platforms above the road on a single row of columns in the median, with the concourse below the platforms and stairs and lifts on both footpaths. Covered bridges keep passengers off the carriageway. The deck is set above the design flood level and the clearance required for road traffic.">
      <rect x={0} y={300} width={640} height={46} fill="url(#soil)" />
      <rect x={40} y={290} width={560} height={10} fill="#9aa3ae" />
      <T x={170} y={284} anchor="middle" size={10}>boulevard carriageways</T>
      <rect x={300} y={160} width={40} height={130} fill={CONCRETE} stroke={INK} strokeWidth={1.2} />
      <rect x={290} y={300} width={60} height={40} fill={CONCRETE} stroke={INK} />
      <T x={358} y={330} size={9.5}>piled foundation</T>
      <rect x={140} y={150} width={360} height={14} fill={CONCRETE} stroke={INK} strokeWidth={1.2} />
      <T x={230} y={180} anchor="middle" size={10}>concourse level</T>
      <rect x={140} y={110} width={360} height={10} fill={CONCRETE} stroke={INK} strokeWidth={1.2} />
      <TrainSection cx={230} base={110} w={56} h={70} />
      <TrainSection cx={410} base={110} w={56} h={70} />
      <rect x={290} y={98} width={60} height={12} fill={CONCRETE} stroke={INK} />
      <T x={320} y={92} anchor="middle" size={10}>platform</T>
      <path d="M130 30 L320 14 L510 30" fill="none" stroke={INK} strokeWidth={1.5} />
      <T x={320} y={10} anchor="middle" size={9.5}>roof</T>
      {[60, 556].map(x => (
        <g key={x}>
          <rect x={x - 14} y={160} width={28} height={130} fill="none" stroke={MUTED} strokeDasharray="3 3" />
          <T x={x} y={154} anchor="middle" size={9} fill={MUTED}>lift, stairs</T>
          <line x1={x + (x < 320 ? 14 : -14)} x2={x < 320 ? 140 : 500} y1={160} y2={160} stroke={INK} strokeWidth={1.2} />
        </g>
      ))}
      <DimV x={622} y1={150} y2={290} label="clearance" side="left" />
    </Frame>
  )
}

export function Interchange() {
  return (
    <Frame n={5} title="Interchange station: two lines crossing at different levels" caption="Where two lines cross, the later line is placed below or above the first, and the transfer is made by stairs, escalators and lifts inside the paid area. Building the structure for both lines in one contract, or leaving passive provision, avoids rebuilding an operating station.">
      <rect x={0} y={44} width={640} height={302} fill="url(#soil)" />
      <rect x={0} y={34} width={640} height={10} fill="#9aa3ae" />
      <rect x={60} y={70} width={520} height={90} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <T x={72} y={88} size={11} weight={600}>Line A platform level (along the page)</T>
      <rect x={80} y={130} width={480} height={10} fill={CONCRETE} stroke={INK} />
      <line x1={70} x2={570} y1={150} y2={150} stroke={INK} strokeWidth={3} />
      <rect x={220} y={190} width={200} height={130} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <T x={320} y={208} anchor="middle" size={11} weight={600}>Line B platform level</T>
      <T x={320} y={222} anchor="middle" size={10} fill={MUTED}>(crossing at right angles)</T>
      <TrainSection cx={270} base={300} w={50} h={64} />
      <TrainSection cx={370} base={300} w={50} h={64} />
      <path d="M300 160 L300 190" stroke="#1d7a3a" strokeWidth={2} markerEnd="url(#arrowExit)" />
      <path d="M340 190 L340 160" stroke="#1d7a3a" strokeWidth={2} markerEnd="url(#arrowExit)" />
      <T x={352} y={180} size={10} fill="#1d7a3a">transfer inside the paid area</T>
      <rect x={60} y={44} width={70} height={26} fill={CONCRETE} stroke={INK} />
      <T x={95} y={61} anchor="middle" size={9.5}>entrance</T>
      <rect x={510} y={44} width={70} height={26} fill={CONCRETE} stroke={INK} />
      <T x={545} y={61} anchor="middle" size={9.5}>entrance</T>
    </Frame>
  )
}

export function Entrance() {
  return (
    <Frame n={6} title="Station entrance raised above the design flood level" caption="Entrances start with a few steps or a ramp up to a threshold above the design flood level, then descend. A slot for flood boards or a flood gate is built in, and a canopy keeps rain out. Lifts have their own raised, sealed shafts.">
      <rect x={0} y={250} width={640} height={96} fill="url(#soil)" />
      <rect x={0} y={240} width={240} height={10} fill="#9aa3ae" />
      <T x={20} y={234} size={10}>footpath</T>
      <line x1={0} x2={640} y1={216} y2={216} stroke="#2f7fd1" strokeDasharray="6 4" />
      <T x={20} y={210} size={10} fill="#2f7fd1">design flood level (to be set from hydrological study)</T>
      <path d="M240 250 L240 240 L260 240 L260 232 L280 232 L280 224 L300 224 L300 196 L320 196" fill="none" stroke={INK} strokeWidth={1.5} />
      <rect x={300} y={196} width={8} height={30} fill={INK} />
      <T x={294} y={188} anchor="end" size={9.5}>flood board slot or gate</T>
      <path d="M320 196 L560 330" fill="none" stroke={INK} strokeWidth={1.5} />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={330 + i * 20} y1={202 + i * 11.2} x2={330 + i * 20} y2={213 + i * 11.2} stroke={INK} />)}
      <T x={330} y={300} size={10}>stairs and escalator down to concourse</T>
      <path d="M220 120 L360 120 L360 128 L220 128 Z" fill={CONCRETE} stroke={INK} />
      <line x1={230} x2={230} y1={128} y2={240} stroke={INK} />
      <line x1={350} x2={350} y1={128} y2={196} stroke={INK} />
      <T x={290} y={114} anchor="middle" size={10}>canopy</T>
      <rect x={560} y={90} width={50} height={160} fill="none" stroke={MUTED} strokeDasharray="3 3" />
      <T x={585} y={84} anchor="middle" size={9.5} fill={MUTED}>lift shaft, sealed</T>
      <DimV x={200} y1={216} y2={240} label="freeboard" side="left" />
    </Frame>
  )
}

export function RiverTunnel() {
  return (
    <Frame n={7} title="River crossing: bored tunnel under the river bed" caption={`Longitudinal profile. The tunnels pass under the river bed with enough cover against flotation and scour, and rise to stations on each bank. Ground investigation from barges, a scour study and the river authority's navigation requirements are needed before the depth can be set.${tonleSap ? ` The Tonle Sap crossing on the proposed Line 2 is about ${Math.round(tonleSap.lengthM / 10) * 10} m over water.` : ''}`}>
      <rect x={0} y={80} width={640} height={266} fill="url(#soil)" />
      <path d="M0 80 L160 80 C 200 80 210 150 250 160 L390 160 C 430 150 440 80 480 80 L640 80 L640 0 L0 0 Z" fill="#fff" />
      <path d="M160 80 C 200 80 210 150 250 160 L390 160 C 430 150 440 80 480 80 Z" fill={WATER} stroke="#2f7fd1" />
      <line x1={170} x2={470} y1={96} y2={96} stroke="#2f7fd1" strokeDasharray="5 4" />
      <T x={320} y={92} anchor="middle" size={10} fill="#2f7fd1">high water (seasonal range several metres)</T>
      <T x={320} y={140} anchor="middle" size={11} fill="#1a3560">river</T>
      <path d="M40 150 C 140 150 160 230 250 236 L390 236 C 480 230 500 150 600 150" fill="none" stroke={INK} strokeWidth={10} />
      <path d="M40 150 C 140 150 160 230 250 236 L390 236 C 480 230 500 150 600 150" fill="none" stroke="#fff" strokeWidth={6} />
      <rect x={20} y={120} width={60} height={46} fill={CONCRETE} stroke={INK} />
      <T x={50} y={112} anchor="middle" size={10}>station</T>
      <rect x={560} y={120} width={60} height={46} fill={CONCRETE} stroke={INK} />
      <T x={590} y={112} anchor="middle" size={10}>station</T>
      <DimV x={320} y1={160} y2={230} label="cover below scour depth" />
      <T x={320} y={262} anchor="middle" size={10}>gradient typically no steeper than 3 to 4 percent</T>
      <T x={320} y={300} anchor="middle" size={10} fill={MUTED}>ground layers and depth to be confirmed by boreholes in the river</T>
    </Frame>
  )
}

export function Tbm() {
  return (
    <Frame n={8} title="Tunnel boring machine (TBM) in soft ground" caption="An earth pressure balance or slurry TBM supports the face with pressurised spoil or bentonite while it excavates, then builds a ring of precast segments behind the shield. Grout fills the gap around the ring to limit settlement. Machines are launched from a station box or shaft and retrieved at the next one.">
      <rect x={0} y={60} width={640} height={286} fill="url(#soil)" />
      <rect x={0} y={44} width={640} height={16} fill="#9aa3ae" />
      <rect x={40} y={60} width={70} height={240} fill={CONCRETE} stroke={INK} strokeWidth={1.2} />
      <T x={75} y={316} anchor="middle" size={10}>launch shaft</T>
      <rect x={110} y={170} width={330} height={90} fill="#fff" stroke={INK} />
      {Array.from({ length: 11 }, (_, i) => <line key={i} x1={120 + i * 30} x2={120 + i * 30} y1={170} y2={260} stroke={CONCRETE} strokeWidth={6} />)}
      <T x={275} y={164} anchor="middle" size={10}>segment rings and grout</T>
      <rect x={440} y={164} width={140} height={102} fill={CONCRETE} stroke={INK} strokeWidth={1.5} />
      <T x={510} y={215} anchor="middle" size={11} weight={600}>shield</T>
      <path d="M580 164 C 600 180 600 250 580 266 Z" fill="#9aa3ae" stroke={INK} />
      <T x={600} y={156} anchor="end" size={10}>cutterhead</T>
      <line x1={150} x2={420} y1={240} y2={240} stroke={MUTED} strokeWidth={2} markerEnd="url(#arrow)" />
      <T x={285} y={254} anchor="middle" size={9.5}>spoil conveyor to shaft</T>
      <path d="M440 148 L600 148" stroke={INK} strokeWidth={1.2} markerEnd="url(#arrow)" />
      <T x={520} y={142} anchor="middle" size={10}>direction of drive</T>
      <line x1={110} x2={640} y1={110} y2={110} stroke="#2f7fd1" strokeDasharray="6 4" />
      <T x={120} y={104} size={10} fill="#2f7fd1">groundwater</T>
      <T x={320} y={84} anchor="middle" size={10}>settlement monitoring points on buildings and roads above</T>
    </Frame>
  )
}

export function FloodProtection() {
  return (
    <Frame n={9} title="Flood protection for underground stations and tunnels" caption="Defence in depth: raised entrances and ventilation openings, flood gates at entrances and at portals where the line comes to the surface, watertight seals on cable and pipe openings, sump pumps with back-up power, and operating procedures linked to flood warnings. Design flood levels must be set from hydrological study, using records such as the Tonle Sap levels at Chaktomuk.">
      <rect x={0} y={190} width={640} height={156} fill="url(#soil)" />
      <rect x={0} y={180} width={640} height={10} fill="#9aa3ae" />
      <line x1={0} x2={640} y1={160} y2={160} stroke="#2f7fd1" strokeDasharray="6 4" />
      <T x={380} y={154} size={10} fill="#2f7fd1">design flood level</T>
      <rect x={60} y={120} width={60} height={60} fill={CONCRETE} stroke={INK} />
      <T x={90} y={112} anchor="middle" size={9.5}>raised entrance</T>
      <rect x={200} y={90} width={40} height={90} fill={CONCRETE} stroke={INK} />
      <T x={220} y={82} anchor="middle" size={9.5}>vent shaft, raised</T>
      <rect x={60} y={210} width={300} height={100} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <T x={210} y={262} anchor="middle" size={11}>underground station</T>
      <rect x={300} y={296} width={50} height={14} fill={WATER} stroke="#2f7fd1" />
      <T x={325} y={326} anchor="middle" size={9.5}>sump and pumps</T>
      <path d="M360 250 L520 250 L600 180" fill="none" stroke={INK} strokeWidth={8} />
      <path d="M360 250 L520 250 L600 180" fill="none" stroke="#fff" strokeWidth={4} />
      <rect x={560} y={150} width={10} height={40} fill={INK} />
      <T x={540} y={140} anchor="middle" size={9.5}>portal flood gate and raised wall</T>
      <rect x={116} y={150} width={6} height={30} fill={INK} />
      <T x={128} y={200} size={9}>gate</T>
    </Frame>
  )
}

export function Ventilation() {
  return (
    <Frame n={10} title="Tunnel ventilation and emergency evacuation" caption="Fans at each station push smoke away from passengers in the direction set by the incident, while passengers walk the other way along the walkway, through a cross-passage into the other tunnel or to the nearest station. Cross-passage spacing is set by the applicable fire code (commonly a few hundred metres).">
      <rect x={0} y={44} width={640} height={302} fill="url(#soil)" />
      <rect x={0} y={34} width={640} height={10} fill="#9aa3ae" />
      <rect x={30} y={130} width={110} height={120} fill={CONCRETE} stroke={INK} />
      <T x={85} y={194} anchor="middle" size={10}>station A</T>
      <rect x={500} y={130} width={110} height={120} fill={CONCRETE} stroke={INK} />
      <T x={555} y={194} anchor="middle" size={10}>station B</T>
      <rect x={140} y={160} width={360} height={50} fill="#fff" stroke={INK} strokeWidth={1.5} />
      <rect x={140} y={230} width={360} height={30} fill="#fff" stroke={INK} />
      <T x={320} y={250} anchor="middle" size={9.5}>parallel tunnel</T>
      {[230, 330, 430].map(x => <rect key={x} x={x - 8} y={210} width={16} height={20} fill="#fff" stroke={INK} />)}
      <T x={330} y={284} anchor="middle" size={9.5}>cross-passages</T>
      <rect x={290} y={168} width={70} height={30} fill="#f3c4c4" stroke="#a33" />
      <T x={325} y={187} anchor="middle" size={9.5} fill="#a33">incident</T>
      <path d="M370 176 L480 176" stroke="#2f7fd1" strokeWidth={2} markerEnd="url(#arrowAir)" />
      <T x={425} y={170} anchor="middle" size={9.5} fill="#2f7fd1">smoke extracted</T>
      <path d="M280 192 L160 192" stroke="#1d7a3a" strokeWidth={2} markerEnd="url(#arrowExit)" />
      <T x={220} y={184} anchor="middle" size={9.5} fill="#1d7a3a">passengers walk to safety</T>
      <rect x={70} y={44} width={30} height={86} fill="none" stroke={INK} />
      <path d="M85 56 L85 120" stroke="#2f7fd1" strokeWidth={2} markerEnd="url(#arrowAir)" />
      <T x={105} y={70} size={9.5}>fresh air supply</T>
      <rect x={540} y={44} width={30} height={86} fill="none" stroke={INK} />
      <path d="M555 56 L555 120" stroke="#2f7fd1" strokeWidth={2} markerStart="url(#arrowAir)" />
      <T x={535} y={70} anchor="end" size={9.5}>exhaust shaft</T>
    </Frame>
  )
}

export function Depot() {
  return (
    <Frame n={11} title="Rail maintenance depot: indicative layout" caption="A depot stores trains overnight and carries out cleaning, inspection and heavy maintenance. A typical metro depot needs roughly 15 to 30 hectares, depending on fleet size, with a connection to the main line, a test track and a site raised above the design flood level. Candidate sites on this proposal have not been checked for ownership or flood level.">
      <rect x={20} y={40} width={600} height={290} fill="#f6f7f9" stroke={INK} strokeDasharray="6 4" />
      <T x={30} y={58} size={10} fill={MUTED}>site boundary, raised platform above design flood level</T>
      {Array.from({ length: 8 }, (_, i) => <line key={i} x1={80} x2={360} y1={90 + i * 14} y2={90 + i * 14} stroke={INK} strokeWidth={1.5} />)}
      <T x={220} y={82} anchor="middle" size={10}>stabling tracks</T>
      <rect x={390} y={78} width={200} height={110} fill={CONCRETE} stroke={INK} />
      <T x={490} y={120} anchor="middle" size={11} weight={600}>maintenance workshop</T>
      <T x={490} y={136} anchor="middle" size={9.5}>inspection pits, lifting, wheel lathe</T>
      <rect x={390} y={200} width={90} height={50} fill="#fff" stroke={INK} />
      <T x={435} y={229} anchor="middle" size={9.5}>wash plant</T>
      <rect x={500} y={200} width={90} height={50} fill="#fff" stroke={INK} />
      <T x={545} y={224} anchor="middle" size={9.5}>control and</T>
      <T x={545} y={236} anchor="middle" size={9.5}>offices</T>
      <line x1={60} x2={600} y1={300} y2={300} stroke={INK} strokeWidth={2} />
      <T x={330} y={294} anchor="middle" size={10}>test track</T>
      <path d="M60 300 L30 330" stroke={INK} strokeWidth={2} />
      <path d="M80 90 L40 140 L40 300" fill="none" stroke={INK} strokeWidth={2} />
      <T x={52} y={318} size={10}>to main line</T>
      <rect x={120} y={220} width={160} height={50} fill="#fff" stroke={INK} />
      <T x={200} y={249} anchor="middle" size={9.5}>stores and substation</T>
    </Frame>
  )
}

export const DIAGRAMS = [TwinBore, IslandPlatform, SidePlatform, ElevatedStation, Interchange, Entrance, RiverTunnel, Tbm, FloodProtection, Ventilation, Depot]
