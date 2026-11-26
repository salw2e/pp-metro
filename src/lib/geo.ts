export type LngLat = [number, number];

const R_EARTH = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LngLat, b: LngLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(h));
}

export function lineLength(coords: LngLat[]): number {
  let m = 0;
  for (let i = 1; i < coords.length; i++) m += haversine(coords[i - 1], coords[i]);
  return m;
}

/** Local equirectangular projection in metres around a reference latitude. Accurate to well under 0.1% across Phnom Penh. */
export function projector(refLat: number) {
  const kx = (Math.PI / 180) * R_EARTH * Math.cos(rad(refLat));
  const ky = (Math.PI / 180) * R_EARTH;
  return {
    fwd: ([lng, lat]: LngLat): [number, number] => [lng * kx, lat * ky],
    inv: ([x, y]: [number, number]): LngLat => [x / kx, y / ky],
  };
}

/** Radius in metres of the circle through three points (Infinity when collinear). */
export function circumradius(a: [number, number], b: [number, number], c: [number, number]): number {
  const ab = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const bc = Math.hypot(c[0] - b[0], c[1] - b[1]);
  const ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
  const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return cross < 1e-9 ? Infinity : (ab * bc * ca) / (2 * cross);
}

export function pointInRing(p: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

type PolyGeom = { type: 'Polygon'; coordinates: LngLat[][] } | { type: 'MultiPolygon'; coordinates: LngLat[][][] };

export function pointInPolygon(p: LngLat, g: PolyGeom): boolean {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  return polys.some(rings => pointInRing(p, rings[0]) && !rings.slice(1).some(h => pointInRing(p, h)));
}

/** Nearest point on a polyline: returns the point, its distance in metres and the distance along the line. */
export function nearestOnLine(p: LngLat, coords: LngLat[], fromAlong = 0) {
  const pr = projector(p[1]);
  const P = pr.fwd(p);
  let best = { point: coords[0], dist: Infinity, along: 0 };
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const A = pr.fwd(coords[i - 1]);
    const B = pr.fwd(coords[i]);
    const dx = B[0] - A[0];
    const dy = B[1] - A[1];
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / len2)) : 0;
    const Q: [number, number] = [A[0] + t * dx, A[1] + t * dy];
    const d = Math.hypot(P[0] - Q[0], P[1] - Q[1]);
    const segLen = Math.sqrt(len2);
    if (d < best.dist && acc + segLen >= fromAlong) {
      const tt = Math.max(t, segLen ? (fromAlong - acc) / segLen : 0);
      const Q2: [number, number] = [A[0] + tt * dx, A[1] + tt * dy];
      const d2 = Math.hypot(P[0] - Q2[0], P[1] - Q2[1]);
      if (d2 < best.dist) best = { point: pr.inv(Q2), dist: d2, along: acc + tt * segLen };
    }
    acc += segLen;
  }
  return best;
}

/** Points every `step` metres along a polyline (always includes both ends). */
export function resample(coords: LngLat[], step: number): LngLat[] {
  const pr = projector(coords[0][1]);
  const pts = coords.map(pr.fwd);
  const out: [number, number][] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const seg = Math.hypot(bx - ax, by - ay);
    let d = step - carry;
    while (d <= seg) {
      out.push([ax + ((bx - ax) * d) / seg, ay + ((by - ay) * d) / seg]);
      d += step;
    }
    carry = seg - (d - step);
  }
  const last = pts[pts.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > 1e-6) out.push(last);
  return out.map(pr.inv);
}

/**
 * Replaces each corner of a polyline with a circular arc of the given radius. The radius is reduced where the
 * neighbouring straights are too short to hold the full arc; the radius actually used is reported per corner.
 */
export function filletPolyline(coords: LngLat[], radius: number, arcStep = 10) {
  const pr = projector(coords[0][1]);
  const pts = coords.map(pr.fwd).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 0.5);
  const out: [number, number][] = [pts[0]];
  const used: number[] = [];
  // tangent length already consumed at the start of each straight by the previous corner
  let consumed = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const [cx, cy] = pts[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay);
    const l2 = Math.hypot(cx - bx, cy - by);
    const u1 = [(bx - ax) / l1, (by - ay) / l1];
    const u2 = [(cx - bx) / l2, (cy - by) / l2];
    const turn = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (turn < 1e-3) { out.push([bx, by]); consumed = 0; continue; }
    const half = Math.tan(turn / 2);
    // the arc may use what is left of the incoming straight and at most half of the outgoing one
    const maxT = Math.min(l1 - consumed, l2 / 2);
    const r = Math.min(radius, Math.max(0, maxT) / half);
    const T = r * half;
    used.push(r);
    const p1: [number, number] = [bx - u1[0] * T, by - u1[1] * T];
    const p2: [number, number] = [bx + u2[0] * T, by + u2[1] * T];
    if (r < 1) { out.push([bx, by]); consumed = 0; continue; }
    // arc centre lies along the inward normal from p1
    const side = Math.sign(u1[0] * u2[1] - u1[1] * u2[0]);
    const n = [-u1[1] * side, u1[0] * side];
    const ctr = [p1[0] + n[0] * r, p1[1] + n[1] * r];
    const a0 = Math.atan2(p1[1] - ctr[1], p1[0] - ctr[0]);
    const steps = Math.max(2, Math.ceil((r * turn) / arcStep));
    for (let s = 0; s <= steps; s++) {
      const a = a0 + side * turn * (s / steps);
      out.push([ctr[0] + r * Math.cos(a), ctr[1] + r * Math.sin(a)]);
    }
    out[out.length - 1] = p2;
    consumed = T;
  }
  out.push(pts[pts.length - 1]);
  return { coords: out.map(pr.inv), radii: used };
}

/** Douglas-Peucker simplification with the tolerance in metres. */
export function simplifyMetres(coords: LngLat[], tol: number): LngLat[] {
  if (coords.length < 3) return coords;
  const pr = projector(coords[0][1]);
  const pts = coords.map(pr.fwd);
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((by - ay) * pts[i][0] - (bx - ax) * pts[i][1] + bx * ay - by * ax) / len;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return coords.filter((_, i) => keep[i]);
}

/** Removes vertices where the line doubles back (turn sharper than `maxTurnDeg`), which routing on dual carriageways produces. */
export function removeSpikes(coords: LngLat[], maxTurnDeg = 100): LngLat[] {
  const pr = projector(coords[0][1]);
  let pts = coords.slice();
  for (let changed = true; changed && pts.length > 2;) {
    changed = false;
    for (let i = 1; i < pts.length - 1; i++) {
      const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]].map(pr.fwd);
      const u = [b[0] - a[0], b[1] - a[1]];
      const v = [c[0] - b[0], c[1] - b[1]];
      const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]) || 1);
      if (Math.acos(Math.max(-1, Math.min(1, cos))) > (maxTurnDeg * Math.PI) / 180) { pts.splice(i, 1); changed = true; break; }
    }
  }
  return pts;
}

/** Merges interior vertices closer than `minLen` metres into their midpoint so that every corner has room for an arc. */
export function mergeClose(coords: LngLat[], minLen: number): LngLat[] {
  let pts = coords.slice();
  for (let changed = true; changed && pts.length > 3;) {
    changed = false;
    for (let i = 1; i < pts.length - 2; i++) {
      if (haversine(pts[i], pts[i + 1]) < minLen) {
        const mid: LngLat = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
        pts.splice(i, 2, mid);
        changed = true;
        break;
      }
    }
  }
  return pts;
}

/** Minimum radius of curvature along a line, estimated from points `span` metres apart. */
export function minRadius(coords: LngLat[], span = 30): number {
  const pts = resample(coords, span);
  const pr = projector(pts[0][1]);
  const P = pts.map(pr.fwd);
  let min = Infinity;
  for (let i = 1; i < P.length - 1; i++) min = Math.min(min, circumradius(P[i - 1], P[i], P[i + 1]));
  return min;
}
