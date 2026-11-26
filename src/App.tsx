import { useEffect, useRef } from 'react'
import maplibregl from './map/maplibre.ts'

export default function App() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const map = new maplibregl.Map({ container: ref.current!, style: 'https://tiles.openfreemap.org/styles/positron', center: [104.91, 11.55], zoom: 11 })
    ;(window as any).__map = map
    map.on('load', async () => {
      const dbg = await (await fetch(import.meta.env.BASE_URL + 'data/_debug.geojson')).json()
      map.addSource('dbg', { type: 'geojson', data: dbg })
      map.addLayer({ id: 'raw', type: 'line', source: 'dbg', filter: ['==', ['get', 'kind'], 'raw'], paint: { 'line-color': ['match', ['get', 'line'], 'L1', '#C8102E', 'L2', '#0057B8', 'L3', '#00843D', 'L4', '#E87722', '#6E3FA3'], 'line-width': 5, 'line-opacity': 0.35 } })
      map.addLayer({ id: 'fin', type: 'line', source: 'dbg', filter: ['==', ['get', 'kind'], 'final'], paint: { 'line-color': '#000', 'line-width': 1.5 } })
      map.addLayer({ id: 'tg', type: 'circle', source: 'dbg', filter: ['==', ['get', 'kind'], 'target'], paint: { 'circle-radius': 4, 'circle-color': '#000' } })
      map.addLayer({ id: 'tgl', type: 'symbol', source: 'dbg', filter: ['==', ['get', 'kind'], 'target'], layout: { 'text-field': ['get', 'id'], 'text-size': 11, 'text-offset': [0, 1], 'text-font': ['Noto Sans Regular'] } })
      ;(window as any).__ready = true
    })
    return () => map.remove()
  }, [])
  return <div ref={ref} style={{ position: 'fixed', inset: 0 }} />
}
