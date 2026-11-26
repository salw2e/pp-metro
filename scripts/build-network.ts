// Builds src/data/network.json from src/data/spec.ts and the OpenStreetMap extracts.
// Run: node --experimental-strip-types scripts/build-network.ts
import fs from 'node:fs';
import { STATIONS, LINES, EXTENSIONS, type Construction, type Routing } from '../src/data/spec.ts';
import {
  type LngLat, haversine, lineLength, filletPolyline, simplifyMetres, nearestOnLine, resample, pointInPolygon, minRadius, removeSpikes, mergeClose, addPlatforms,
} from '../src/lib/geo.ts';

const root = new URL('..', import.meta.url);
const read = (p: string) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));

const roads = read('data/raw/roads.geojson');
const railways = read('public/data/railways.geojson');
const water = read('public/data/water.geojson');
const districts = read('public/data/districts.geojson');
const places = read('public/data/places.geojson');

// 2019 census, Table P-12 (National Institute of Statistics). Keys are OSM relation ids of the khans.
const KHAN_POP: Record<string, { pop: number; code: string }> = {
  'relation/2259496': { pop: 71092, code: '1203' },
  'relation/2259497': { pop: 70772, code: '1201' },
  'relation/2259498': { pop: 159772, code: '1205' },
  'relation/2259499': { pop: 155069, code: '1202' },
  'relation/2259500': { pop: 248464, code: '1206' },
  'relation/2259502': { pop: 274861, code: '1207' },
  'relation/2259503': { pop: 182903, code: '1208' },
  'relation/2259504': { pop: 145570, code: '1204' },
  'relation/6076126': { pop: 164379, code: '1212' },
  'relation/6076129': { pop: 159233, code: '1210' },
  'relation/9590423': { pop: 226971, code: '1209' },
  'relation/11165697': { pop: 188190, code: '1211' },
  'relation/11165749': { pop: 66658, code: '1213' },
  'relation/11166794': { pop: 75526, code: '1214' },
};

const RIVER_NAMES: Record<string, string> = {
  'ទន្លេ​បាសាក់': 'Bassac River', 'ទន្លេ​មេគង្គ': 'Mekong River', 'ទន្លេ​សាប': 'Tonle Sap River', 'ព្រែកត្នោត': 'Prek Tnaot',
};

// ---------- graph routing ----------
type Edge = { to: string; w: number; name?: string };
type Graph = { nodes: Map<string, LngLat>; adj: Map<string, Edge[]> };
const key = (c: LngLat) => `${c[0].toFixed(6)},${c[1].toFixed(6)}`;

function buildGraph(features: any[], weight: (props: any) => number): Graph {
  const nodes = new Map<string, LngLat>();
  const adj = new Map<string, Edge[]>();
  const roadOf = new Map<string, string>();
  for (const f of features) {
    const lines: LngLat[][] = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [];
    const k = weight(f.properties);
    for (const coords of lines) {
      for (let i = 1; i < coords.length; i++) {
        const a = key(coords[i - 1]);
        const b = key(coords[i]);
        nodes.set(a, coords[i - 1]);
        nodes.set(b, coords[i]);
        const w = haversine(coords[i - 1], coords[i]) * k;
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        const name = `${f.properties['name:en'] ?? ''} ${f.properties.name ?? ''}`;
        const road = (f.properties['name:en'] ?? f.properties.name ?? f.id) as string;
        roadOf.set(a, road);
        roadOf.set(b, road);
        adj.get(a)!.push({ to: b, w, name });
        adj.get(b)!.push({ to: a, w, name });
      }
    }
  }
  // simplified ways do not always share a vertex at junctions: link nodes closer than 5 m
  const cell = 0.00005;
  const grid = new Map<string, string[]>();
  for (const [k, c] of nodes) {
    const g = `${Math.floor(c[0] / cell)},${Math.floor(c[1] / cell)}`;
    if (!grid.has(g)) grid.set(g, []);
    grid.get(g)!.push(k);
  }
  for (const [k, c] of nodes) {
    const gx = Math.floor(c[0] / cell);
    const gy = Math.floor(c[1] / cell);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const k2 of grid.get(`${gx + dx},${gy + dy}`) ?? []) {
        if (k2 === k) continue;
        const d = haversine(c, nodes.get(k2)!);
        if (d < 5) adj.get(k)!.push({ to: k2, w: d });
      }
    }
  }
  // dead ends usually continue on a minor road that is not in the extract: bridge gaps up to 250 m (weighted double)
  // a dead end has no neighbour on another road
  const ends = [...nodes.keys()].filter(k => adj.get(k)!.every(e => roadOf.get(e.to) === roadOf.get(k)) && adj.get(k)!.length <= 2);
  for (const k of ends) {
    const c = nodes.get(k)!;
    let best = '';
    let bd = 250;
    for (const [k2, c2] of nodes) {
      if (k2 === k || roadOf.get(k2) === roadOf.get(k) || adj.get(k)!.some(e => e.to === k2)) continue;
      if (Math.abs(c2[1] - c[1]) > 0.0025 || Math.abs(c2[0] - c[0]) > 0.0025) continue;
      const d = haversine(c, c2);
      if (d < bd && d > 5) { bd = d; best = k2; }
    }
    if (best) { adj.get(k)!.push({ to: best, w: bd * 2 }); adj.get(best)!.push({ to: k, w: bd * 2 }); }
  }
  return { nodes, adj };
}

function nearestNode(g: Graph, p: LngLat) {
  let best = '';
  let dist = Infinity;
  for (const [k, c] of g.nodes) {
    const d = haversine(p, c);
    if (d < dist) { dist = d; best = k; }
  }
  return { key: best, dist };
}

function shortestPath(g: Graph, from: string, to: string, prefer?: RegExp): LngLat[] {
  const dist = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const heap: [number, string][] = [[0, from]];
  const push = (item: [number, string]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, u] = pop();
    if (u === to) break;
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const { to: v, w, name } of g.adj.get(u) ?? []) {
      // the named boulevard is made three times cheaper so the route stays on it where it exists
      const nd = d + (prefer && name && prefer.test(name) ? w / 3 : w);
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); push([nd, v]); }
    }
  }
  if (!dist.has(to)) throw new Error(`no path ${from} -> ${to}`);
  const path: LngLat[] = [];
  for (let k: string | undefined = to; k; k = prev.get(k)) path.push(g.nodes.get(k)!);
  return path.reverse();
}

// Boulevards are preferred over secondary roads so that alignments stay under wide streets.
const roadGraph = buildGraph(roads.features, p => (p.highway === 'secondary' ? 1.6 : 1));
const railGraph = buildGraph(railways.features.filter((f: any) => f.properties.railway === 'rail' && !f.properties.service), () => 1);
const stationById = new Map(STATIONS.map(s => [s.id, s]));
const lngLat = (at: [number, number]): LngLat => [at[1], at[0]];

const warnings: string[] = [];

function route(a: LngLat, b: LngLat, via: Routing, label: string, prefer?: string): LngLat[] {
  if (via === 'direct') return [a, b];
  const g = via === 'road' ? roadGraph : railGraph;
  const na = nearestNode(g, a);
  const nb = nearestNode(g, b);
  if (na.dist > 150 || nb.dist > 150) warnings.push(`${label}: nearest ${via} node is ${Math.round(Math.max(na.dist, nb.dist))} m from the target`);
  return shortestPath(g, na.key, nb.key, prefer ? new RegExp(prefer, 'i') : undefined);
}

function splitAt(coords: LngLat[], cuts: number[]): LngLat[][] {
  // cuts are distances along the line; returns len(cuts)-1 pieces between consecutive cuts
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversine(coords[i - 1], coords[i]));
  const at = (d: number): LngLat => {
    const i = cum.findIndex(c => c >= d);
    if (i === -1) return coords[coords.length - 1];
    if (i === 0) return coords[0];
    const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
    return [coords[i - 1][0] + t * (coords[i][0] - coords[i - 1][0]), coords[i - 1][1] + t * (coords[i][1] - coords[i - 1][1])];
  };
  const out: LngLat[][] = [];
  for (let s = 0; s < cuts.length - 1; s++) {
    const [d0, d1] = [cuts[s], cuts[s + 1]];
    const piece: LngLat[] = [at(d0)];
    for (let i = 0; i < coords.length; i++) if (cum[i] > d0 && cum[i] < d1) piece.push(coords[i]);
    piece.push(at(d1));
    out.push(piece);
  }
  return out;
}

const round = (c: LngLat): LngLat => [+c[0].toFixed(6), +c[1].toFixed(6)];

function riverCrossings(coords: LngLat[]) {
  const pts = resample(coords, 10);
  const runs: { river: string; riverKm: string; lengthM: number; at: LngLat; coords: LngLat[] }[] = [];
  let cur: (typeof runs)[number] | null = null;
  for (const p of pts) {
    const hit = water.features.find((f: any) => pointInPolygon(p, f.geometry));
    if (hit) {
      const km = hit.properties.name ?? '';
      if (!cur) { cur = { river: RIVER_NAMES[km] ?? 'Unnamed water body', riverKm: km, lengthM: 0, at: p, coords: [] }; runs.push(cur); }
      cur.lengthM += 10;
      cur.coords.push(round(p));
    } else cur = null;
  }
  // ignore ponds and channels under 40 m; they are drainage, not river crossings
  return runs.filter(r => r.lengthM >= 40).map(r => ({ ...r, at: round(r.coords[r.coords.length >> 1]) }));
}

function districtOf(p: LngLat) {
  const f = districts.features.find((d: any) => pointInPolygon(p, d.geometry));
  if (!f) return null;
  const pop = KHAN_POP[f.id];
  return { en: (f.properties['name:en'] as string).replace(/^Khan /, ''), km: f.properties.name as string, pop2019: pop?.pop ?? null, nisCode: pop?.code ?? null };
}

const KIND: [string, (p: any) => boolean][] = [
  ['Airport', p => p.aeroway === 'aerodrome'],
  ['Railway station', p => p.railway === 'station' || p.railway === 'halt'],
  ['University', p => p.amenity === 'university'],
  ['Hospital', p => p.amenity === 'hospital'],
  ['Heritage and landmarks', p => !!p.historic || p.tourism === 'museum' || p.tourism === 'attraction' || p.building === 'palace' || p.amenity === 'place_of_worship'],
  ['Stadium', p => p.leisure === 'stadium'],
  ['Shopping centre', p => p.shop === 'mall'],
  ['Market', p => p.amenity === 'marketplace'],
  ['Bus terminal', p => p.amenity === 'bus_station'],
];
const kindOf = (p: any) => KIND.find(([, f]) => f(p))?.[0] ?? null;

function nearby(p: LngLat, radius: number, filter: (kind: string, props: any) => boolean, limit: number) {
  const seen = new Set<string>();
  const perKind = new Map<string, number>();
  return places.features
    .map((f: any) => ({ f, d: haversine(p, f.geometry.coordinates), kind: kindOf(f.properties) }))
    .filter((x: any) => x.kind && x.d <= radius && filter(x.kind, x.f.properties))
    .sort((a: any, b: any) => KIND.findIndex(k => k[0] === a.kind) - KIND.findIndex(k => k[0] === b.kind) || a.d - b.d)
    .filter((x: any) => {
      const en = x.f.properties['name:en'] ?? x.f.properties.name;
      if (!en || seen.has(en)) return false;
      // at most two of each kind so that one category does not crowd out the rest
      if ((perKind.get(x.kind) ?? 0) >= 2) return false;
      perKind.set(x.kind, (perKind.get(x.kind) ?? 0) + 1);
      seen.add(en);
      return true;
    })
    .slice(0, limit)
    .map((x: any) => ({
      en: (x.f.properties['name:en'] ?? x.f.properties.name) as string,
      km: (x.f.properties['name:km'] ?? (/[ក-៿]/.test(x.f.properties.name ?? '') ? x.f.properties.name : null)) as string | null,
      kind: x.kind as string,
      distanceM: Math.round(x.d / 10) * 10,
      osm: x.f.id as string,
    }));
}

function neighbourhoods(p: LngLat) {
  return places.features
    .filter((f: any) => ['suburb', 'neighbourhood', 'quarter', 'island'].includes(f.properties.place))
    .map((f: any) => ({ en: (f.properties['name:en'] ?? f.properties.name) as string, d: haversine(p, f.geometry.coordinates) }))
    .filter((x: any) => x.d < 1200)
    .sort((a: any, b: any) => a.d - b.d)
    .slice(0, 4)
    .map((x: any) => x.en);
}

// ---------- lines ----------
type StationUse = { line: string; code: string; type: Construction; index: number };
const uses = new Map<string, StationUse[]>();
const perLine = new Map<string, { p: LngLat; snapM: number }[]>();
const stationPos = new Map<string, { p: LngLat; snapM: number; offsetM: number }>();

const debug: any[] = [];
const platformR = new Map<string, number>();
const lines = LINES.map(line => {
  const targets = line.stations.map(id => lngLat(stationById.get(id)!.at));
  let raw: LngLat[] = [];
  if (line.segments.every(s => s.via === 'rail')) {
    // the railway has few vertices between stations, so route terminal to terminal and place stations on it
    raw = route(targets[0], targets[targets.length - 1], 'rail', line.id);
  } else {
    line.segments.forEach((seg, i) => {
      const path = route(targets[i], targets[i + 1], seg.via, `${line.id} ${line.stations[i]}-${line.stations[i + 1]}`, seg.prefer);
      raw = raw.length ? [...raw, ...path.slice(1)] : path;
    });
  }
  // a metro alignment follows the street corridor, not each carriageway: simplify to 40 m and drop reversals
  const simple = line.radius ? removeSpikes(mergeClose(removeSpikes(simplifyMetres(removeSpikes(raw, 120), 40), 100), 150), 100) : simplifyMetres(raw, 4);
  debug.push({ type: 'Feature', properties: { line: line.id, kind: 'raw' }, geometry: { type: 'LineString', coordinates: raw } });
  debug.push(...targets.map((t, i) => ({ type: 'Feature', properties: { line: line.id, kind: 'target', id: line.stations[i] }, geometry: { type: 'Point', coordinates: t } })));
  const plat = line.radius ? addPlatforms(simple, targets) : { coords: simple, isEnd: simple.map(() => false) };
  // a platform end may only give 75 m of the 300 m straight to its curve, keeping 150 m straight for the platform
  const { coords, radii } = line.radius ? filletPolyline(plat.coords, line.radius, 10, i => (plat.isEnd[i] ? 75 : Infinity)) : { coords: simple, radii: [] as number[] };
  if (line.radius) {
    // report where the design radius could not be achieved
    let k = 0;
    for (let i = 1; i < plat.coords.length - 1; i++) {
      const r = radii[k++];
      if (r !== undefined && r < line.radius - 1 && r > 1) warnings.push(`${line.id} curve R ${Math.round(r)} m at ${plat.coords[i][1].toFixed(5)},${plat.coords[i][0].toFixed(5)}`);
    }
  }

  let last = 0;
  const along = targets.map((t, i) => {
    const n = nearestOnLine(t, coords, last + (i ? 200 : 0));
    last = n.along;
    if (!perLine.has(line.stations[i])) perLine.set(line.stations[i], [])
    perLine.get(line.stations[i])!.push({ p: n.point, snapM: n.dist });
    return n.along;
  });
  for (let i = 1; i < along.length; i++) if (along[i] <= along[i - 1]) warnings.push(`${line.id}: station ${line.stations[i]} is out of order along the alignment`);

  debug.push({ type: 'Feature', properties: { line: line.id, kind: 'final' }, geometry: { type: 'LineString', coordinates: coords } });
  const pieces = splitAt(coords, along);
  const segments = line.segments.map((s, i) => ({
    from: line.stations[i], to: line.stations[i + 1], type: s.type, note: s.note ?? null,
    lengthM: Math.round(lineLength(pieces[i])),
    coords: pieces[i].map(round),
  }));
  const totalLen = lineLength(coords);
  line.stations.forEach((id, i) => {
    // radius over a 150 m platform centred on the station (ends clipped at terminals)
    const c0 = Math.max(0, along[i] - 75);
    const c1 = Math.min(totalLen, along[i] + 75);
    const plat = splitAt(coords, [c0, c1])[0];
    const platR = plat.length > 2 ? minRadius(plat, 25) : Infinity;
    platformR.set(`${line.id}:${id}`, platR);
    const adj = [line.segments[i - 1]?.type, line.segments[i]?.type].filter(Boolean) as Construction[];
    const type: Construction = adj.includes('underground') ? 'underground' : adj.includes('elevated') ? 'elevated' : 'surface';
    if (!uses.has(id)) uses.set(id, []);
    uses.get(id)!.push({ line: line.id, code: `${line.code}${String(i + 1).padStart(2, '0')}`, type, index: i });
  });

  const byType = { underground: 0, elevated: 0, surface: 0 } as Record<Construction, number>;
  for (const s of segments) byType[s.type] += s.lengthM;
  const crossings = riverCrossings(coords).map(c => {
    const seg = segments.find(s => nearestOnLine(c.at, s.coords).dist < 5);
    return { ...c, segmentType: seg?.type ?? null, between: seg ? [seg.from, seg.to] : null };
  });
  const spacing = along.slice(1).map((a, i) => Math.round(a - along[i]));
  const tight = radii.filter(r => r < line.radius - 1);
  return {
    id: line.id, code: line.code, en: line.en, km: line.km, color: line.color, summary: line.summary, phase: line.phase,
    stations: line.stations, segments,
    lengthM: Math.round(lineLength(coords)),
    byType,
    stationSpacingM: { min: Math.min(...spacing), max: Math.max(...spacing), mean: Math.round(spacing.reduce((a, b) => a + b, 0) / spacing.length) },
    curves: line.radius ? { designRadiusM: line.radius, minRadiusM: Math.round(Math.min(...radii.filter(r => r > 1), Infinity)), belowTarget: tight.length, measuredMinRadiusM: Math.round(minRadius(coords, 30)) } : null,
    riverCrossings: crossings,
    depot: { ...line.depot, at: round(lngLat(line.depot.at)) },
  };
});

// an interchange sits at the centre of its platforms on each line; the platform offset is reported
for (const [id, pts] of perLine) {
  const p: LngLat = [pts.reduce((a, x) => a + x.p[0], 0) / pts.length, pts.reduce((a, x) => a + x.p[1], 0) / pts.length];
  let offsetM = 0;
  for (const a of pts) for (const b of pts) offsetM = Math.max(offsetM, haversine(a.p, b.p));
  stationPos.set(id, { p, snapM: Math.min(...pts.map(x => x.snapM)), offsetM });
}

// ---------- stations ----------
const stations = STATIONS.map(s => {
  const pos = stationPos.get(s.id);
  if (!pos) throw new Error(`station ${s.id} is not on any line`);
  const u = uses.get(s.id)!;
  const p = pos.p;
  const district = districtOf(p);
  const nearWater = water.features.some((f: any) => resample([p, [p[0] + 0.0027, p[1]]], 50).some(q => pointInPolygon(q, f.geometry))) ||
    water.features.some((f: any) => resample([p, [p[0] - 0.0027, p[1]]], 50).some(q => pointInPolygon(q, f.geometry)));
  const landmarks = nearby(p, 700, k => k !== 'Bus terminal' && k !== 'Railway station', 6);
  const transport = nearby(p, 800, k => k === 'Bus terminal' || k === 'Railway station' || k === 'Airport', 3);
  const heritage = landmarks.some(l => l.kind === 'Heritage and landmarks' && l.distanceM <= 300);
  return {
    id: s.id, en: s.en, km: s.km,
    lat: +p[1].toFixed(6), lng: +p[0].toFixed(6),
    snapM: Math.round(pos.snapM),
    platformOffsetM: Math.round(pos.offsetM),
    lines: u.map(x => x.line), codes: u.map(x => x.code), types: u.map(x => x.type),
    interchange: new Set(u.map(x => x.line)).size > 1,
    terminal: u.some(x => x.index === 0 || x.index === LINES.find(l => l.id === x.line)!.stations.length - 1),
    district, neighbourhoods: neighbourhoods(p), landmarks, transport,
    flags: {
      nearRiver: nearWater,
      heritage,
      // a platform needs straight track; under 1,000 m radius the station box must move in design
      platformOnCurve: u.filter(x => (platformR.get(`${x.line}:${s.id}`) ?? Infinity) < 1000).map(x => x.line),
    },
    why: s.why,
  };
});

// ---------- extensions ----------
const extensions = EXTENSIONS.map(x => {
  const from = stationPos.get(x.from)!.p;
  const path = route(from, lngLat(x.to), x.via, `${x.id}`);
  const coords = filletPolyline(removeSpikes(simplifyMetres([from, ...path, lngLat(x.to)], 40), 100), 300).coords;
  return { ...x, to: round(lngLat(x.to)), coords: coords.map(round), lengthM: Math.round(lineLength(coords)) };
});

const network = {
  generated: new Date().toISOString().slice(0, 10),
  status: 'Preliminary proposal. Not an approved or official alignment.',
  sources: ['OpenStreetMap contributors (ODbL 1.0), retrieved via Overpass API', 'National Institute of Statistics, General Population Census 2019, Table P-12'],
  lines, stations, extensions,
};
fs.writeFileSync(new URL('src/data/network.json', root), JSON.stringify(network));
fs.writeFileSync(new URL('public/data/_debug.geojson', root), JSON.stringify({ type: 'FeatureCollection', features: debug }));

for (const l of lines) {
  console.log(`${l.id} ${(l.lengthM / 1000).toFixed(1)} km  U ${(l.byType.underground / 1000).toFixed(1)} E ${(l.byType.elevated / 1000).toFixed(1)} S ${(l.byType.surface / 1000).toFixed(1)}  spacing ${l.stationSpacingM.min}-${l.stationSpacingM.max}  minR ${l.curves?.minRadiusM ?? '-'} (${l.curves?.belowTarget ?? 0} below) measured ${l.curves?.measuredMinRadiusM ?? '-'}  rivers ${l.riverCrossings.map(c => `${c.river} ${c.lengthM}m ${c.segmentType}`).join('; ')}`);
}
for (const s of stations) if (s.snapM > 60) console.log(`station ${s.id} moved ${s.snapM} m`);
for (const s of stations) if (s.platformOffsetM > 20) console.log(`station ${s.id} platforms ${s.platformOffsetM} m apart`);
for (const s of stations) if (s.flags.platformOnCurve.length) console.log(`station ${s.id} platform on curve (${s.flags.platformOnCurve.join(',')})`);
for (const x of extensions) console.log(`${x.id} ${(x.lengthM / 1000).toFixed(1)} km`);
for (const w of warnings) console.log('WARN', w);
