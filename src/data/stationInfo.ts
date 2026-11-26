import type { Station } from './network'

const ACCESS: Record<string, string[]> = {
  underground: [
    'Step-free route from street to platform by at least two lifts per station, one per side of the road',
    'Platform screen doors and tactile paving on all walking routes',
    'Escalators paired with fixed stairs at each entrance',
    'Accessible ticket gates and help points at platform level',
  ],
  elevated: [
    'Lifts from both sides of the road to the concourse and platform',
    'Platform screen doors or half-height gates, tactile paving and covered walkways',
    'Covered pedestrian bridges so that passengers do not cross the boulevard at grade',
  ],
  surface: [
    'Level boarding between platform and train',
    'Ramps no steeper than 1:12 and tactile paving',
    'Signal-protected pedestrian crossings at each platform end',
  ],
}

export function accessibility(s: Station): string[] {
  const t = s.types.includes('underground') ? 'underground' : s.types.includes('elevated') ? 'elevated' : 'surface'
  const out = [...ACCESS[t]]
  if (s.interchange) out.push('Step-free transfer between lines without leaving the paid area')
  return out
}

export function construction(s: Station): string[] {
  const out: string[] = []
  if (s.types.includes('underground')) {
    out.push('Station box built cut-and-cover or top-down in the boulevard, with traffic diversions during construction')
    out.push('Soft alluvial ground and a high, seasonally varying water table: diaphragm walls, dewatering control and settlement monitoring of nearby buildings')
    out.push('Utility diversion (water, drainage, power, telecommunications) before excavation; utility records must be surveyed')
  }
  if (s.types.includes('elevated')) {
    out.push('Piled foundations in the road median; viaduct and station built with precast segments to limit road closure')
    out.push('Noise and visual impact on frontages; finished level above the design flood level')
  }
  if (s.types.includes('surface') && !s.types.includes('underground') && !s.types.includes('elevated')) {
    out.push('Platform and fencing built beside the existing or new track; level crossings need grade separation or signal protection')
  }
  if (s.interchange) out.push('Interchange stations should be built in one contract, or with passive provision for the later line, to avoid rebuilding')
  if (s.flags.nearRiver) out.push('Within about 300 m of a river: entrances and ventilation openings must sit above the design flood level')
  if (s.flags.heritage) out.push('Heritage or landmark site within 300 m: entrance location and vibration limits need agreement with the responsible authorities')
  if (s.flags.platformOnCurve.length) out.push(`Platform currently lies on a curve on line ${s.flags.platformOnCurve.join(', ')}; the station box must be shifted to straight track in design`)
  if (s.terminal) out.push('Terminal: provide turnback sidings and space for a future extension')
  return out
}

export function verification(s: Station): { label: string; detail: string } {
  const parts = [
    `Coordinates placed on the routed alignment ${s.snapM} m from the target position`,
    'landmarks and transport points taken from OpenStreetMap within 700 to 800 m',
    s.district ? `district from OpenStreetMap khan boundaries, population from the 2019 census` : 'location outside the Phnom Penh khan boundaries in OpenStreetMap',
  ]
  return { label: 'Desk study only. Not field-verified.', detail: `${parts.join('; ')}. Site visits, land records, utility surveys and boreholes are required before any station position can be confirmed.` }
}

export const KIND_KM: Record<string, string> = {
  Airport: 'អាកាសយានដ្ឋាន',
  'Railway station': 'ស្ថានីយ៍រថភ្លើង',
  University: 'សាកលវិទ្យាល័យ',
  Hospital: 'មន្ទីរពេទ្យ',
  'Heritage and landmarks': 'បេតិកភណ្ឌ និងទីតាំងសំខាន់',
  Stadium: 'ពហុកីឡដ្ឋាន',
  'Shopping centre': 'ផ្សារទំនើប',
  Market: 'ផ្សារ',
  'Bus terminal': 'ចំណតឡានក្រុង',
}
