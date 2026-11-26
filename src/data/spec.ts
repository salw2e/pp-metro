// Input to scripts/build-network.ts. Coordinates here are target positions; the build script snaps them to the
// routed alignment and reports how far each one moved. Every alignment is a preliminary proposal.

export type Construction = 'underground' | 'elevated' | 'surface';
export type Routing = 'road' | 'direct' | 'rail';

export interface StationSpec {
  id: string;
  en: string;
  km: string;
  at: [number, number]; // [lat, lng] target
  why: string; // planning justification
}

export interface LineSpec {
  id: string;
  code: string;
  en: string;
  km: string;
  color: string;
  summary: string;
  stations: string[];
  // one entry per gap between consecutive stations
  segments: { type: Construction; via: Routing; prefer?: string; note?: string }[];
  radius: number; // design target for curves, metres
  depot: { en: string; km: string; at: [number, number]; note: string };
  phase: string;
}

export interface ExtensionSpec {
  id: string;
  line: string;
  en: string;
  km: string;
  from: string;
  to: [number, number];
  toEn: string;
  toKm: string;
  via: Routing;
  why: string;
}

export const STATIONS: StationSpec[] = [
  // Line 1
  { id: 'km9', en: 'Kilometre 9', km: 'គីឡូម៉ែត្រលេខ៩', at: [11.6365, 104.888], why: 'Northern terminus on National Road 5 beside the Kilometre 9 bus terminal. Intercepts trips from Prek Pnov and Russey Keo before they reach the city centre.' },
  { id: 'km6', en: 'Kilometre 6', km: 'គីឡូម៉ែត្រលេខ៦', at: [11.622, 104.9085], why: 'Kilometre 6 area on National Road 5, between Russey Keo and the northern terminus.' },
  { id: 'russeykeo', en: 'Russey Keo', km: 'ឫស្សីកែវ', at: [11.6073, 104.9183], why: 'Serves Khan Russey Keo, the most populous khan in the 2019 census, along National Road 5.' },
  { id: 'tuolsangkae', en: 'Tuol Sangkae', km: 'ទួលសង្កែ', at: [11.5925, 104.9182], why: 'Tuol Sangkae market area and the northern end of Monivong Boulevard, where the line enters the dense core.' },
  { id: 'calmette', en: 'Calmette', km: 'កាល់ម៉ែត', at: [11.5812, 104.9176], why: 'Calmette Hospital and the ministries along northern Monivong Boulevard.' },
  { id: 'centralmarket', en: 'Central Market', km: 'ផ្សារធំថ្មី', at: [11.5693, 104.9189], why: 'Central business district. Interchange between Lines 1 and 2, with a walking link of about 450 m to Phnom Penh railway station.' },
  { id: 'sihanouk', en: 'Preah Sihanouk', km: 'ព្រះសីហនុ', at: [11.5559, 104.9206], why: 'Junction of Monivong and Preah Sihanouk Boulevards. Interchange between Lines 1 and 3, between the Olympic Stadium and the Independence Monument.' },
  { id: 'bkk', en: 'Boeng Keng Kang', km: 'បឹងកេងកង', at: [11.5442, 104.9224], why: 'Junction of Monivong and Mao Tse Toung Boulevards. Interchange between Lines 1 and 4 serving Boeng Keng Kang and Chamkar Mon.' },
  { id: 'kbalthnal', en: 'Kbal Thnal', km: 'ក្បាលថ្នល់', at: [11.5282, 104.929], why: 'Kbal Thnal junction where Monivong Boulevard meets National Road 2 and Samdech Techo Hun Sen Boulevard. Transition from underground to elevated.' },
  { id: 'chakangre', en: 'Chak Angre', km: 'ចាក់អង្រែ', at: [11.511, 104.925], why: 'Chak Angre and Mean Chey residential areas, about 800 m from Chak Angre market.' },
  { id: 'meanchey', en: 'Mean Chey', km: 'មានជ័យ', at: [11.484, 104.919], why: 'Southern growth corridor on Samdech Techo Hun Sen Boulevard near AEON Mall Mean Chey. Branch point for a possible extension to Takhmao.' },
  { id: 'nr2', en: 'National Road 2', km: 'ផ្លូវជាតិលេខ២', at: [11.4524, 104.9227], why: 'Crossing of National Road 2 and the airport road at the flyover in Ta Khmau municipality (Kandal Province). Serves new development on the southern edge of the capital.' },
  { id: 'ringroad3', en: 'Ring Road 3', km: 'ផ្លូវក្រវ៉ាត់ក្រុងទី៣', at: [11.4202, 104.932], why: 'Crossing of Ring Road 3 on the airport approach. Provisional station for future development; could be deferred until demand is shown.' },
  { id: 'kti', en: 'Techo International Airport', km: 'អាកាសយានដ្ឋានអន្តរជាតិតេជោ', at: [11.3606, 104.9335], why: 'Techo International Airport, which opened on 9 September 2025 about 20 km south of the city. No rail link has been published. Station position at the terminal forecourt must be agreed with the airport owner and operator.' },
  // Line 2
  { id: 'chomchao', en: 'Chom Chao', km: 'ចោមចៅ', at: [11.5364, 104.8314], why: 'Western terminus at the Chom Chao junction of Russian Boulevard and National Road 4. Interchange between Lines 2 and 3 and site of the shared western depot.' },
  { id: 'oldairport', en: 'Former Airport', km: 'អតីតព្រលានយន្តហោះ', at: [11.554, 104.845], why: 'Former Phnom Penh International Airport (Pochentong). Commercial flights moved to Techo International Airport in September 2025; future use of the site is not confirmed.' },
  { id: 'pochentong', en: 'Pochentong', km: 'ពោធិ៍ចិនតុង', at: [11.563, 104.8572], why: 'Pochentong market and the dense area along Russian Boulevard east of the former airport.' },
  { id: 'teukthla', en: 'Teuk Thla', km: 'ទឹកថ្លា', at: [11.5628, 104.872], why: 'Junction of Russian Boulevard and Hanoi Road (Ring Road 2), a feeder corridor from Sen Sok and Phnom Penh Thmey.' },
  { id: 'rupp', en: 'Royal University', km: 'សាកលវិទ្យាល័យភូមិន្ទ', at: [11.5655, 104.8887], why: 'Royal University of Phnom Penh and nearby campuses. The line leaves Russian Boulevard here and follows Kampuchea Krom Boulevard.' },
  { id: 'itc', en: 'Institute of Technology', km: 'វិទ្យាស្ថានបច្ចេកវិទ្យា', at: [11.567, 104.9005], why: 'Kampuchea Krom at Mao Tse Toung Boulevard, beside the Institute of Technology of Cambodia. Interchange between Lines 2 and 4.' },
  { id: 'watphnom', en: 'Wat Phnom', km: 'វត្តភ្នំ', at: [11.5748, 104.9218], why: 'Wat Phnom, the riverside and the northern CBD. The station box must be kept clear of the hill and temple; see heritage notes.' },
  { id: 'chroychangvar', en: 'Chroy Changvar', km: 'ជ្រោយចង្វារ', at: [11.5902, 104.9276], why: 'First station across the Tonle Sap, at the east end of the Chroy Changvar Bridge on National Road 6. The peninsula is linked to the centre only by road bridges.' },
  { id: 'ccnorth', en: 'Chroy Changvar North', km: 'ជ្រោយចង្វារខាងជើង', at: [11.61, 104.9268], why: 'Northern Chroy Changvar along National Road 6, an area with large planned developments.' },
  // Line 3
  { id: 'vengsreng', en: 'Veng Sreng West', km: 'វេងស្រេងខាងលិច', at: [11.5295, 104.85], why: 'Western Veng Sreng Boulevard industrial corridor, where many factory workers commute daily.' },
  { id: 'vengsrenge', en: 'Veng Sreng East', km: 'វេងស្រេងខាងកើត', at: [11.5325, 104.874], why: 'Eastern Veng Sreng Boulevard, factories and worker housing south of Stueng Mean Chey.' },
  { id: 'stuengmeanchey', en: 'Stueng Mean Chey', km: 'ស្ទឹងមានជ័យ', at: [11.5465, 104.8975], why: 'Stueng Mean Chey market area at the eastern end of Veng Sreng Boulevard.' },
  { id: 'olympic', en: 'Olympic', km: 'អូឡាំពិក', at: [11.5524, 104.9025], why: 'Junction of Monireth, Mao Tse Toung and Preah Sihanouk Boulevards, about 700 m from the National Olympic Stadium. Interchange between Lines 3 and 4.' },
  { id: 'independence', en: 'Independence Monument', km: 'វិមានឯករាជ្យ', at: [11.5561, 104.9298], why: 'Independence Monument, Norodom Boulevard and the government and embassy district. Heritage setting requires careful entrance design.' },
  { id: 'kohpich', en: 'Koh Pich', km: 'កោះពេជ្រ', at: [11.5474, 104.94], why: 'Koh Pich (Diamond Island) exhibition, commercial and residential district.' },
  { id: 'chbarampov', en: 'Chbar Ampov', km: 'ច្បារអំពៅ', at: [11.5316, 104.9497], why: 'Chbar Ampov market on National Road 1, east of the Bassac. Khan Chbar Ampov had about 164,000 residents in 2019.' },
  { id: 'kohnorea', en: 'Koh Norea', km: 'កោះនរា', at: [11.5389, 104.9625], why: 'Koh Norea reclaimed island development, reached from National Road 1.' },
  { id: 'vealsbov', en: 'Veal Sbov', km: 'វាលស្បូវ', at: [11.5333, 104.978], why: 'Eastern terminus near the Veal Sbov bus station on National Road 1, intercepting traffic from Kien Svay.' },
  // Line 4
  { id: 'sensok', en: 'Sen Sok', km: 'សែនសុខ', at: [11.6002, 104.8854], why: 'Northern terminus near AEON Mall Sen Sok City, serving large western and northern residential developments.' },
  { id: 'tkavenue', en: 'Tuol Kouk North', km: 'ទួលគោកខាងជើង', at: [11.5865, 104.8975], why: 'Northern Tuol Kouk near TK Avenue.' },
  { id: 'tuolkouk', en: 'Tuol Kouk', km: 'ទួលគោក', at: [11.5755, 104.8985], why: 'Tuol Kouk market and the residential core of Khan Tuol Kouk.' },
  { id: 'tuoltumpung', en: 'Tuol Tumpung', km: 'ទួលទំពូង', at: [11.544, 104.9147], why: 'Tuol Tumpung (Russian) Market on Mao Tse Toung Boulevard.' },
  // Line 5 (existing railway)
  { id: 'ppstation', en: 'Phnom Penh Railway Station', km: 'ស្ថានីយ៍រថភ្លើងភ្នំពេញ', at: [11.5723, 104.9145], why: 'Existing Royal Railway terminus, built in 1932. About 450 m from the Central Market metro interchange.' },
  { id: 'railitc', en: 'Boeng Kak', km: 'បឹងកក់', at: [11.5711, 104.9], why: 'Railway crossing of Mao Tse Toung Boulevard, about 450 m north of the Institute of Technology metro station.' },
  { id: 'railhanoi', en: 'Hanoi Road', km: 'ផ្លូវហាណូយ', at: [11.5698, 104.8706], why: 'Railway crossing of Hanoi Road (Ring Road 2), serving Teuk Thla and southern Sen Sok.' },
  { id: 'railpochentong', en: 'Pochentong North', km: 'ពោធិ៍ចិនតុងខាងជើង', at: [11.5675, 104.85], why: 'North side of the former airport and Pochentong.' },
  { id: 'railjunction', en: 'West Junction', km: 'ចំណុចប្រសព្វខាងលិច', at: [11.5663, 104.8297], why: 'Junction of the northern and southern railway lines. Possible park-and-ride site.' },
  { id: 'railkamboul', en: 'Kamboul', km: 'កំបូល', at: [11.577, 104.7566], why: 'Khan Kamboul on the northern line, at the western edge of the capital.' },
];

export const LINES: LineSpec[] = [
  {
    id: 'L1', code: '1', en: 'North–South Line', km: 'ខ្សែជើង-ត្បូង', color: '#C8102E',
    summary: 'National Road 5, Monivong Boulevard and Samdech Techo Hun Sen Boulevard to Techo International Airport. Follows the north-south corridor screened in the JICA 2014 study and adds the airport.',
    stations: ['km9', 'km6', 'russeykeo', 'tuolsangkae', 'calmette', 'centralmarket', 'sihanouk', 'bkk', 'kbalthnal', 'chakangre', 'meanchey', 'nr2', 'ringroad3', 'kti'],
    segments: [
      { type: 'elevated', via: 'road', prefer: 'National Highway 5' },
      { type: 'elevated', via: 'road', prefer: 'National Highway 5' },
      { type: 'elevated', via: 'road', prefer: 'National Highway 5|Monivong' },
      { type: 'underground', via: 'road', prefer: 'Monivong', note: 'Portal north of Tuol Sangkae station' },
      { type: 'underground', via: 'road', prefer: 'Monivong' },
      { type: 'underground', via: 'road', prefer: 'Monivong' },
      { type: 'underground', via: 'road', prefer: 'Monivong' },
      { type: 'underground', via: 'road', prefer: 'Monivong|Hun Sen', note: 'Portal south of Kbal Thnal station' },
      { type: 'elevated', via: 'road', prefer: 'Hun Sen' },
      { type: 'elevated', via: 'road', prefer: 'Hun Sen' },
      { type: 'elevated', via: 'road', prefer: 'Hun Sen' },
      { type: 'elevated', via: 'road' },
      { type: 'surface', via: 'road', note: 'Fenced at-grade alignment in open land; elevated if the corridor is developed first' },
    ],
    radius: 300,
    depot: { en: 'Kandal Stueng depot', km: 'ដេប៉ូកណ្ដាលស្ទឹង', at: [11.395, 104.935], note: 'Open land near the airport approach. Ownership and flood level not verified.' },
    phase: 'Phase 1 (central section) and Phase 2 (airport section)',
  },
  {
    id: 'L2', code: '2', en: 'East–West Line', km: 'ខ្សែកើត-លិច', color: '#0057B8',
    summary: 'Russian Boulevard and Kampuchea Krom Boulevard to Central Market, then under the Tonle Sap to Chroy Changvar. Follows the east-west corridor of the JICA 2014 study.',
    stations: ['chomchao', 'oldairport', 'pochentong', 'teukthla', 'rupp', 'itc', 'centralmarket', 'watphnom', 'chroychangvar', 'ccnorth'],
    segments: [
      { type: 'elevated', via: 'road', prefer: 'Russian', note: 'JICA (2014) reported that elevated structures were not permitted on Russian Boulevard. This section needs approval or must go underground.' },
      { type: 'underground', via: 'road', prefer: 'Russian' },
      { type: 'underground', via: 'road', prefer: 'Russian' },
      { type: 'underground', via: 'road', prefer: 'Russian' },
      { type: 'underground', via: 'direct', note: 'Under Kampuchea Krom Boulevard' },
      { type: 'underground', via: 'direct', note: 'Under Kampuchea Krom Boulevard' },
      { type: 'underground', via: 'direct', note: 'Bored under city blocks; building foundations must be surveyed' },
      { type: 'underground', via: 'direct', note: 'Bored tunnel under the Tonle Sap' },
      { type: 'elevated', via: 'direct', note: 'Along National Road 6' },
    ],
    radius: 300,
    depot: { en: 'Chom Chao depot (shared with Line 3)', km: 'ដេប៉ូចោមចៅ', at: [11.53, 104.815], note: 'Candidate site west of Chom Chao along National Road 4. Land availability not verified.' },
    phase: 'Phase 2',
  },
  {
    id: 'L3', code: '3', en: 'Southwest–East Line', km: 'ខ្សែនិរតី-កើត', color: '#00843D',
    summary: 'Veng Sreng Boulevard, Preah Sihanouk Boulevard and Koh Pich, crossing the Bassac to Chbar Ampov and National Road 1. Links the industrial southwest with the centre and the east bank.',
    stations: ['chomchao', 'vengsreng', 'vengsrenge', 'stuengmeanchey', 'olympic', 'sihanouk', 'independence', 'kohpich', 'chbarampov', 'kohnorea', 'vealsbov'],
    segments: [
      { type: 'elevated', via: 'road', prefer: 'Veng Sreng' },
      { type: 'elevated', via: 'road', prefer: 'Veng Sreng' },
      { type: 'elevated', via: 'road', prefer: 'Veng Sreng' },
      { type: 'underground', via: 'road', prefer: 'Monireth|Mao Tse', note: 'Portal west of Olympic station' },
      { type: 'underground', via: 'road', prefer: 'Sihanouk' },
      { type: 'underground', via: 'road', prefer: 'Sihanouk' },
      { type: 'underground', via: 'direct', note: 'Bored tunnel under the Bassac channel west of Koh Pich' },
      { type: 'underground', via: 'direct', note: 'Bored tunnel under the main Bassac channel' },
      { type: 'elevated', via: 'road', prefer: 'National Highway 1' },
      { type: 'elevated', via: 'road', prefer: 'National Highway 1' },
    ],
    radius: 300,
    depot: { en: 'Chom Chao depot (shared with Line 2)', km: 'ដេប៉ូចោមចៅ', at: [11.53, 104.815], note: 'Shared with Line 2.' },
    phase: 'Phase 3',
  },
  {
    id: 'L4', code: '4', en: 'Northwest Line', km: 'ខ្សែពាយ័ព្យ', color: '#E87722',
    summary: 'Sen Sok and Tuol Kouk, then along Mao Tse Toung Boulevard to Boeng Keng Kang. Connects the northwestern growth areas to Lines 2, 3 and 1.',
    stations: ['sensok', 'tkavenue', 'tuolkouk', 'itc', 'olympic', 'tuoltumpung', 'bkk'],
    segments: [
      { type: 'elevated', via: 'direct', note: 'Follows local streets not included in the major-road dataset; alignment indicative' },
      { type: 'underground', via: 'direct', note: 'Portal south of Tuol Kouk North station' },
      { type: 'underground', via: 'direct' },
      { type: 'underground', via: 'road', prefer: 'Mao Tse' },
      { type: 'underground', via: 'road', prefer: 'Mao Tse' },
      { type: 'underground', via: 'road', prefer: 'Mao Tse' },
    ],
    radius: 250,
    depot: { en: 'Sen Sok depot', km: 'ដេប៉ូសែនសុខ', at: [11.61, 104.875], note: 'Candidate site north of Sen Sok. Land availability not verified.' },
    phase: 'Phase 3',
  },
  {
    id: 'L5', code: '5', en: 'Commuter Rail (existing railway)', km: 'រថភ្លើងធ្វើដំណើរ (ផ្លូវដែកមានស្រាប់)', color: '#6E3FA3',
    summary: 'Commuter service on the existing Royal Railway line from Phnom Penh station to Kamboul. Lowest cost option; the JICA 2014 plan also proposed commuter trains on the existing railway.',
    stations: ['ppstation', 'railitc', 'railhanoi', 'railpochentong', 'railjunction', 'railkamboul'],
    segments: [
      { type: 'surface', via: 'rail' },
      { type: 'surface', via: 'rail' },
      { type: 'surface', via: 'rail' },
      { type: 'surface', via: 'rail' },
      { type: 'surface', via: 'rail' },
    ],
    radius: 0,
    depot: { en: 'Phnom Penh station yard (existing)', km: 'ទីធ្លាស្ថានីយ៍រថភ្លើងភ្នំពេញ', at: [11.572, 104.907], note: 'Existing railway yard operated under the Royal Railway concession.' },
    phase: 'Early action (Phase 0)',
  },
];

export const EXTENSIONS: ExtensionSpec[] = [
  { id: 'X1', line: 'L1', en: 'Line 1 north to Morodok Techo', km: 'ផ្នែកបន្ថែមខ្សែ ១ ទៅមរតកតេជោ', from: 'km9', to: [11.6815, 104.878], toEn: 'Morodok Techo National Stadium', toKm: 'ពហុកីឡដ្ឋានជាតិមរតកតេជោ', via: 'direct', why: 'Event and future residential demand in Prek Pnov. Justify with demand data before committing.' },
  { id: 'X2', line: 'L1', en: 'Takhmao branch', km: 'ខ្សែបំបែកទៅតាខ្មៅ', from: 'meanchey', to: [11.4845, 104.9435], toEn: 'Takhmao', toKm: 'តាខ្មៅ', via: 'direct', why: 'Takhmao lies about 2.5 km east of the airport corridor. A branch is cheaper than diverting the airport line through it.' },
  { id: 'X3', line: 'L4', en: 'Line 4 north to Phnom Penh Thmey', km: 'ផ្នែកបន្ថែមខ្សែ ៤ ទៅភ្នំពេញថ្មី', from: 'sensok', to: [11.622, 104.8573], toEn: 'Phnom Penh Thmey', toKm: 'ភ្នំពេញថ្មី', via: 'direct', why: 'Northern residential growth along Hanoi Road.' },
];
