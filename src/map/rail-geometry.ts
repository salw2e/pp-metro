import { projector, type LngLat } from '../lib/geo'

/** Compute shared offset edges before tiling, so neighbouring deck pieces meet exactly. */
export function railStrips(coords: LngLat[], half: number, offset = 0): LngLat[][] {
  const pr = projector(coords[0][1])
  const points = coords.map(pr.fwd)
  const normal = (a: LngLat, b: LngLat): LngLat => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / length, (b[0] - a[0]) / length]
  }
  const left: LngLat[] = [], right: LngLat[] = []
  for (let i = 0; i < points.length; i++) {
    const incoming = normal(points[Math.max(0, i - 1)], points[i === 0 ? 1 : i])
    const outgoing = normal(points[i === points.length - 1 ? i - 1 : i], points[Math.min(points.length - 1, i + 1)])
    const nx = incoming[0] + outgoing[0], ny = incoming[1] + outgoing[1]
    // Bound sharp joins; the route generator normally supplies gentle railway curves.
    const scale = 1 / Math.max(0.5, nx * outgoing[0] + ny * outgoing[1])
    const p = points[i]
    left.push(pr.inv([p[0] + nx * scale * (offset + half), p[1] + ny * scale * (offset + half)]))
    right.push(pr.inv([p[0] + nx * scale * (offset - half), p[1] + ny * scale * (offset - half)]))
  }
  const rings: LngLat[][] = []
  for (let i = 0; i < points.length - 1; i += 16) {
    const end = Math.min(points.length, i + 17)
    rings.push([...left.slice(i, end), ...right.slice(i, end).reverse(), left[i]])
  }
  return rings
}
