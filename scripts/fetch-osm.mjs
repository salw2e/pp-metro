// Downloads the OpenStreetMap layers used by the map and writes simplified GeoJSON to public/data.
// Data (c) OpenStreetMap contributors, ODbL 1.0. Run: node scripts/fetch-osm.mjs
import fs from 'node:fs';
import osmtogeojson from 'osmtogeojson';

const BBOX = '11.30,104.70,11.75,105.05';
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const OUT = new URL('../public/data/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

const QUERIES = {
  districts: `area["name:en"="Phnom Penh"]["admin_level"="4"]->.pp;
    rel(area.pp)["boundary"="administrative"]["admin_level"="6"]; out geom;`,
  railways: `way["railway"~"^(rail|disused|abandoned|construction)$"](${BBOX}); out geom;`,
  water: `(way["natural"="water"]["water"="river"](${BBOX}); rel["natural"="water"]["water"="river"](${BBOX}); way["waterway"="riverbank"](${BBOX});); out geom;`,
  bridges: `way["bridge"="yes"]["highway"~"^(motorway|trunk|primary|secondary)$"](${BBOX}); out geom;`,
  roads: `way["highway"~"^(motorway|trunk|primary|secondary)$"](${BBOX}); out geom;`,
  places: `(
    nwr["amenity"~"^(university|hospital|marketplace|bus_station)$"]["name"](${BBOX});
    nwr["shop"="mall"]["name"](${BBOX});
    nwr["tourism"~"^(attraction|museum)$"]["name"](${BBOX});
    nwr["historic"~"^(monument|memorial)$"]["name"](${BBOX});
    nwr["leisure"="stadium"]["name"](${BBOX});
    nwr["aeroway"="aerodrome"](${BBOX});
    nwr["railway"~"^(station|halt)$"](${BBOX});
    nwr["amenity"="place_of_worship"]["name"~"^Wat |Wat Phnom|វត្តភ្នំ"](${BBOX});
    nwr["building"="palace"](${BBOX});
    nwr["place"~"^(suburb|neighbourhood|quarter|island)$"]["name"](${BBOX});
  ); out center tags;`,
};

async function overpass(q) {
  const body = new URLSearchParams({ data: `[out:json][timeout:180];${q}` });
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = MIRRORS[attempt % MIRRORS.length];
    try {
      const r = await fetch(url, { method: 'POST', body, headers: { 'User-Agent': 'pp-metro-data-script' } });
      const text = await r.text();
      if (r.ok && text.startsWith('{')) return JSON.parse(text);
      console.warn(`  ${url} -> ${r.status}`);
    } catch (e) { console.warn(`  ${url} -> ${e.message}`); }
    await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
  }
  throw new Error('all Overpass mirrors failed');
}

// Douglas-Peucker in degrees; 0.00008 deg is roughly 9 m at this latitude.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const [fx, fy] = pts[0], [lx, ly] = pts[pts.length - 1];
  if (fx === lx && fy === ly && pts.length > 4) {
    // closed ring: the chord is zero length, so simplify each half separately
    const m = pts.length >> 1;
    return [...simplify(pts.slice(0, m + 1), tol).slice(0, -1), ...simplify(pts.slice(m), tol)];
  }
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]).map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)]);
}
function simplifyGeom(g, tol) {
  if (g.type === 'LineString') return { ...g, coordinates: simplify(g.coordinates, tol) };
  if (g.type === 'MultiLineString' || g.type === 'Polygon') return { ...g, coordinates: g.coordinates.map(c => simplify(c, tol)) };
  if (g.type === 'MultiPolygon') return { ...g, coordinates: g.coordinates.map(p => p.map(c => simplify(c, tol))) };
  if (g.type === 'Point') return { ...g, coordinates: g.coordinates.map(v => +v.toFixed(6)) };
  return g;
}

const KEEP_TAGS = ['name', 'name:en', 'name:km', 'amenity', 'shop', 'tourism', 'historic', 'leisure', 'aeroway', 'railway', 'place', 'building', 'iata', 'operator', 'usage', 'service', 'admin_level', 'highway', 'bridge', 'water'];

function write(name, fc, tol) {
  fc.features = fc.features
    .filter(f => f.geometry)
    .map(f => {
      const p = {};
      for (const k of KEEP_TAGS) if (f.properties[k] != null) p[k] = f.properties[k];
      p.osm_id = f.id;
      const g = f.geometry.type === 'Point' ? f.geometry : simplifyGeom(f.geometry, tol);
      return { type: 'Feature', id: f.id, properties: p, geometry: g };
    });
  const meta = { source: 'OpenStreetMap contributors via Overpass API', license: 'ODbL 1.0', retrieved: new Date().toISOString().slice(0, 10) };
  fs.writeFileSync(new URL(`${name}.geojson`, OUT), JSON.stringify({ type: 'FeatureCollection', metadata: meta, features: fc.features }));
  console.log(`${name}: ${fc.features.length} features, ${(fs.statSync(new URL(`${name}.geojson`, OUT)).size / 1024).toFixed(0)} KB`);
}

const only = process.argv[2];
for (const [name, q] of Object.entries(QUERIES)) {
  if (only && only !== name) continue;
  console.log(`fetching ${name}`);
  const raw = await overpass(q);
  let fc = osmtogeojson(raw);
  if (name === 'places') {
    // ways and relations come back with a center; turn everything into points
    fc.features = raw.elements.map(e => ({
      type: 'Feature', id: `${e.type}/${e.id}`, properties: e.tags || {},
      geometry: { type: 'Point', coordinates: e.type === 'node' ? [e.lon, e.lat] : [e.center.lon, e.center.lat] },
    }));
  }
  if (name === 'districts') fc.features = fc.features.filter(f => /Polygon/.test(f.geometry?.type));
  if (name === 'roads') {
    // routing needs every junction node, so roads stay unsimplified and outside public/
    fs.mkdirSync(new URL('../data/raw/', import.meta.url), { recursive: true });
    fs.writeFileSync(new URL('../data/raw/roads.geojson', import.meta.url), JSON.stringify(fc));
    console.log(`roads: ${fc.features.length} features (data/raw)`);
  } else write(name, fc, name === 'districts' ? 0.00015 : 0.00008);
  await new Promise(r => setTimeout(r, 3000));
}
