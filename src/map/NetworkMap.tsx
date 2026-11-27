import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MLMap, MapGeoJSONFeature, GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl'
import { Crosshair, Download, Layers3, Maximize2, Ruler, RotateCcw, Box, X, ChevronUp, ChevronDown, Video, Square } from 'lucide-react'
import maplibregl from './maplibre'
import { BASEMAPS, BASEMAP_ORDER, fallbackStyle, type BasemapId } from './basemaps'
import { installLabelImages } from './labels'
import { addOverlay, applyVisibility, DEFAULT_LAYERS, LAYER_GROUPS, setFocus, setLang, setSelected, loadData, type LayerKey, type OverlayState } from './overlay'
import { lines, stations, stationById, lineBounds, km, extensions, depots } from '../data/network'
import { useLang } from '../i18n'
import { navigate } from '../router'
import { StationPanel } from '../components/StationPanel'
import { LineMark, download } from '../components/ui'
import { haversine, type LngLat } from '../lib/geo'
import { buildExport } from '../lib/exports'
import { add3D, set3D, startTour } from './three'

const HOME = { center: [104.905, 11.535] as [number, number], zoom: 10.6 }
const ALL = lines.map(l => l.id)

function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

type SearchItem = { kind: 'station' | 'district' | 'landmark'; id: string; en: string; km: string; sub: string; at: LngLat }

function useSearchIndex() {
  const [items, setItems] = useState<SearchItem[]>(() => stations.map(s => ({ kind: 'station', id: s.id, en: s.en, km: s.km, sub: s.codes.join(' / '), at: [s.lng, s.lat] })))
  useEffect(() => {
    let live = true
    Promise.all([loadData('districts'), loadData('places')]).then(([d, p]) => {
      if (!live) return
      const extra: SearchItem[] = []
      for (const f of d.features) {
        const g = f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
        const ring = (g.type === 'Polygon' ? g.coordinates[0] : g.coordinates.map(x => x[0]).sort((a, b) => b.length - a.length)[0]) as LngLat[]
        const c = ring.reduce((a, q) => [a[0] + q[0] / ring.length, a[1] + q[1] / ring.length], [0, 0]) as LngLat
        const pr = f.properties as Record<string, string>
        extra.push({ kind: 'district', id: String(f.id), en: String(pr['name:en'] ?? '').replace(/^Khan /, ''), km: pr.name, sub: 'District', at: c })
      }
      for (const f of p.features) {
        const pr = f.properties as Record<string, string>
        const en = pr['name:en'] ?? pr.name
        if (!en || pr.place) continue
        extra.push({ kind: 'landmark', id: String(f.id), en, km: pr['name:km'] ?? (/[ក-៿]/.test(pr.name ?? '') ? pr.name : en), sub: pr.amenity ?? pr.shop ?? pr.tourism ?? pr.historic ?? pr.leisure ?? pr.aeroway ?? pr.railway ?? '', at: (f.geometry as GeoJSON.Point).coordinates as LngLat })
      }
      setItems(prev => [...prev.filter(x => x.kind === 'station'), ...extra])
    }).catch(() => {})
    return () => { live = false }
  }, [])
  return items
}

function SearchBox({ onPick }: { onPick: (i: SearchItem) => void }) {
  const { t, lang } = useLang()
  const items = useSearchIndex()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const order = { station: 0, district: 1, landmark: 2 }
    return items
      .filter(i => i.en.toLowerCase().includes(s) || i.km?.includes(q.trim()) || i.sub.toLowerCase().includes(s))
      .sort((a, b) => order[a.kind] - order[b.kind] || Number(!a.en.toLowerCase().startsWith(s)) - Number(!b.en.toLowerCase().startsWith(s)))
      .slice(0, 8)
  }, [q, items])
  const pick = (i: SearchItem) => { onPick(i); setOpen(false); setQ(lang === 'km' ? i.km || i.en : i.en) }
  return (
    <div className="relative">
      <label htmlFor="map-search" className="sr-only">{t('map.search')}</label>
      <input
        id="map-search"
        type="search"
        role="combobox"
        aria-expanded={open && q.length > 0}
        aria-controls="map-search-list"
        aria-autocomplete="list"
        autoComplete="off"
        value={q}
        placeholder={t('map.search')}
        onChange={e => { setQ(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
          else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]) }
          else if (e.key === 'Escape') setOpen(false)
        }}
        className="w-full h-10 px-3 border border-line-strong rounded-sm bg-white text-[14px] placeholder:text-muted"
      />
      {open && q.trim() && (
        <ul id="map-search-list" role="listbox" className="absolute z-20 left-0 right-0 mt-1 bg-white border border-line-strong shadow-md max-h-80 overflow-y-auto">
          {results.length === 0 && <li className="px-3 py-2 text-muted text-[13px]">{t('map.noResults')}</li>}
          {results.map((r, i) => (
            <li
              key={`${r.kind}-${r.id}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(r) }}
              className={`px-3 py-2 cursor-pointer text-[13.5px] border-b border-line last:border-0 ${i === active ? 'bg-navy-50' : ''}`}
            >
              <span className="block">{lang === 'km' && r.km ? r.km : r.en}</span>
              <span className="block text-[12px] text-muted">{r.kind === 'station' ? `${t('legend.station')} ${r.sub}` : r.kind === 'district' ? t('st.district') : r.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function NetworkMap({ initialStation, initialLine }: { initialStation?: string | null; initialLine?: string | null }) {
  const { t, lang, name, num } = useLang()
  const wrap = useRef<HTMLDivElement>(null)
  const mapArea = useRef<HTMLDivElement>(null)
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const [basemap, setBasemap] = useState<BasemapId>('light')
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [focusLine, setFocusLine] = useState<string | null>(initialLine ?? null)
  const [selected, setSel] = useState<string | null>(initialStation ?? null)
  const [tab, setTab] = useState<'lines' | 'layers' | 'legend'>('lines')
  const [sheet, setSheet] = useState(!!initialStation)
  const [ready, setReady] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [noWebgl] = useState(() => !webglAvailable())
  // the coordinate readout is written straight to the DOM: a React update on every frame made dragging stutter
  const coordRef = useRef<HTMLSpanElement>(null)
  const [touring, setTouring] = useState(false)
  const stopTour = useRef<(() => void) | null>(null)
  const [measure, setMeasure] = useState<{ on: boolean; pts: LngLat[] }>({ on: false, pts: [] })
  const [pitched, setPitched] = useState(false)
  const state = useRef<OverlayState>({ lang, layers, focusLine, selected, transit: false })
  state.current = { lang, layers, focusLine, selected, transit: basemap === 'transit' }
  const measureRef = useRef(measure)
  measureRef.current = measure

  const fitAll = useCallback((ids = ALL) => {
    const m = mapRef.current
    if (!m) return
    const narrow = (wrap.current?.clientWidth ?? 1000) < 1024
    m.fitBounds(lineBounds(ids) as LngLatBoundsLike, { padding: narrow ? { top: 120, bottom: 90, left: 30, right: 30 } : 60, duration: 600, pitch: m.getPitch(), bearing: m.getBearing() })
  }, [])

  const select = useCallback((id: string | null, fly = true) => {
    setSel(id)
    const params = new URLSearchParams(location.search)
    if (id) params.set('station', id); else params.delete('station')
    history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`)
    if (id) {
      setSheet(true)
      const s = stationById.get(id)!
      if (fly) mapRef.current?.flyTo({ center: [s.lng, s.lat], zoom: Math.max(mapRef.current.getZoom(), 14), duration: 700 })
    }
  }, [])

  // map creation
  useEffect(() => {
    if (noWebgl || !el.current) return
    const map = new maplibregl.Map({
      container: el.current,
      style: BASEMAPS.light.style,
      center: HOME.center,
      zoom: HOME.zoom,
      maxPitch: 70,
      minZoom: 8,
      maxBounds: [[104.3, 11.0], [105.5, 12.1]],
      attributionControl: { compact: true },
      dragRotate: true,
      touchPitch: true,
      // phones report 3x pixel density; 2x looks the same on a map and renders far faster
      pixelRatio: Math.min(devicePixelRatio || 1, 2),
      canvasContextAttributes: { preserveDrawingBuffer: false, antialias: (devicePixelRatio || 1) < 2 },
    } as maplibregl.MapOptions)
    mapRef.current = map
    ;(window as unknown as { __map: MLMap }).__map = map
    installLabelImages(map)
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')
    map.addControl(new maplibregl.FullscreenControl({ container: mapArea.current! }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 120 }), 'bottom-left')

    let loaded = false
    const fonts = Promise.all([
      document.fonts.load('500 12px "IBM Plex Sans"'), document.fonts.load('600 12px "IBM Plex Sans"'),
      document.fonts.load('500 12px "Noto Sans Khmer"', 'ក'), document.fonts.load('600 12px "Noto Sans Khmer"', 'ក'),
    ]).catch(() => {})
    map.on('style.load', async () => {
      loaded = true
      await fonts
      await addOverlay(map, state.current)
      add3D(map)
      set3D(map, map.getPitch() > 20)
      setReady(true)
      showCoords(map.getCenter())
      ;(window as unknown as { __ready: boolean }).__ready = true
    })
    // the vector style failed outright: show the raster fallback with a notice
    const timer = setTimeout(() => { if (!loaded) { setFallback(true); map.setStyle(fallbackStyle, { diff: false }) } }, 12000)
    map.on('error', e => {
      const msg = String((e as unknown as { error?: { message?: string } }).error?.message ?? '')
      if (!loaded && /style|Failed to fetch|NetworkError|404|AJAX/i.test(msg)) { clearTimeout(timer); setFallback(true); map.setStyle(fallbackStyle, { diff: false }) }
    })
    const hoverDevice = matchMedia('(hover: hover)').matches
    let coordFrame = 0
    const showCoords = (c: { lng: number; lat: number }) => {
      if (coordFrame) return
      coordFrame = requestAnimationFrame(() => {
        coordFrame = 0
        if (coordRef.current) coordRef.current.textContent = `${c.lat.toFixed(5)}° N, ${c.lng.toFixed(5)}° E`
      })
    }
    map.on('mousemove', e => showCoords(e.lngLat))
    if (!hoverDevice) map.on('move', () => showCoords(map.getCenter()))
    let tilted = false
    map.on('pitch', () => {
      const p = map.getPitch() > 20
      if (p !== tilted) { tilted = p; setPitched(p); set3D(map, p) }
    })

    // hover information on devices with a mouse
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: '280px' })
    const hoverable = ['st-circle', 'st-ring', 'net-line', 'ext-line', 'depot-icon', 'river-x']
    const describe = (f: MapGeoJSONFeature) => {
      const p = f.properties as Record<string, string>
      const L = state.current.lang
      const nm = (o: { en: string; km?: string }) => (L === 'km' && o.km ? o.km : o.en)
      if (p.kind === 'station') return `<strong>${nm({ en: p.en, km: p.km })}</strong><br><span style="font-family:var(--font-mono)">${p.codes}</span>`
      if (p.kind === 'segment') {
        const line = lines.find(l => l.id === p.line)!
        const a = stationById.get(p.from)!, b = stationById.get(p.to)!
        return `<strong>${nm(line)}</strong><br>${nm(a)} to ${nm(b)}<br>${p.type}, ${(+p.lengthM / 1000).toFixed(2)} km${p.note ? `<br><span style="color:#5d6877">${p.note}</span>` : ''}`
      }
      if (p.kind === 'extension') return `<strong>${nm({ en: p.en, km: p.km })}</strong><br>Future extension, ${(+p.lengthM / 1000).toFixed(1)} km`
      if (p.kind === 'depot') return `<strong>${nm({ en: p.en, km: p.km })}</strong><br>${p.note}`
      if (p.kind === 'river') return `<strong>${p.river}</strong><br>${p.type} crossing, about ${p.lengthM} m over water`
      return ''
    }
    // hover lookups run at most once per frame and never while the map is being dragged
    let hoverFrame = 0
    let lastHover: maplibregl.MapMouseEvent | null = null
    map.on('mousemove', e => {
      if (!hoverDevice || measureRef.current.on) return
      lastHover = e
      if (hoverFrame) return
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0
        const ev = lastHover
        if (!ev || map.isMoving() || (ev.originalEvent as MouseEvent).buttons) { popup.remove(); return }
        const fs = map.queryRenderedFeatures(ev.point, { layers: hoverable.filter(id => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none') })
        map.getCanvas().style.cursor = fs.length ? 'pointer' : ''
        if (fs.length) popup.setLngLat(ev.lngLat).setHTML(describe(fs[0])).addTo(map)
        else popup.remove()
      })
    })
    map.on('dragstart', () => popup.remove())
    map.on('mouseout', () => popup.remove())
    map.on('click', e => {
      const m = measureRef.current
      if (m.on) {
        setMeasure({ on: true, pts: [...m.pts, [e.lngLat.lng, e.lngLat.lat]] })
        return
      }
      const box: [[number, number], [number, number]] = [[e.point.x - 8, e.point.y - 8], [e.point.x + 8, e.point.y + 8]]
      const st = map.queryRenderedFeatures(box, { layers: ['st-circle', 'st-ring'].filter(id => map.getLayer(id)) })
      if (st.length) { select(String(st[0].properties.id)); return }
      const other = map.queryRenderedFeatures(box, { layers: hoverable.filter(id => map.getLayer(id)) })
      if (other.length && !matchMedia('(hover: hover)').matches) {
        new maplibregl.Popup({ offset: 10, maxWidth: '260px' }).setLngLat(e.lngLat).setHTML(describe(other[0])).addTo(map)
      }
    })
    map.on('dblclick', e => {
      if (measureRef.current.on) { e.preventDefault(); setMeasure(m => ({ on: false, pts: m.pts })) }
    })
    return () => { clearTimeout(timer); map.remove(); mapRef.current = null }
  }, [noWebgl, select])

  // initial focus from the URL once the overlay is ready
  const didInit = useRef(false)
  useEffect(() => {
    if (!ready || didInit.current) return
    didInit.current = true
    if (initialStation && stationById.has(initialStation)) select(initialStation)
    else if (initialLine && ALL.includes(initialLine)) fitAll([initialLine])
    else fitAll()
  }, [ready, initialStation, initialLine, fitAll, select])

  // basemap switching (the overlay is re-added on style.load)
  const firstStyle = useRef(true)
  useEffect(() => {
    const m = mapRef.current
    if (!m) return
    if (firstStyle.current) { firstStyle.current = false; return }
    setReady(false)
    setFallback(false)
    m.setStyle(BASEMAPS[basemap].style, { diff: false })
    if (basemap === '3d') m.easeTo({ pitch: BASEMAPS['3d'].pitch, bearing: -20, duration: 800 })
    else if (m.getPitch() > 0 && basemap !== 'streets') m.easeTo({ pitch: 0, bearing: 0, duration: 600 })
  }, [basemap])

  useEffect(() => { const m = mapRef.current; if (m && ready) applyVisibility(m, layers) }, [layers, ready])
  useEffect(() => { const m = mapRef.current; if (m && ready) setFocus(m, focusLine) }, [focusLine, ready])
  useEffect(() => { const m = mapRef.current; if (m && ready) setSelected(m, selected) }, [selected, ready])
  useEffect(() => { const m = mapRef.current; if (m && ready) setLang(m, lang) }, [lang, ready])

  // measurement layer
  useEffect(() => {
    const m = mapRef.current
    if (!m || !ready) return
    m.doubleClickZoom[measure.on ? 'disable' : 'enable']()
    m.getCanvas().style.cursor = measure.on ? 'crosshair' : ''
    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        ...(measure.pts.length > 1 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: measure.pts } }] : []),
        ...measure.pts.map(p => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: p } })),
      ],
    }
    const src = m.getSource('measure') as GeoJSONSource | undefined
    if (src) src.setData(data)
    else {
      m.addSource('measure', { type: 'geojson', data })
      m.addLayer({ id: 'measure-line', type: 'line', source: 'measure', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': '#12284a', 'line-width': 2.5, 'line-dasharray': [3, 2] } })
      m.addLayer({ id: 'measure-pt', type: 'circle', source: 'measure', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 4.5, 'circle-color': '#ffffff', 'circle-stroke-color': '#12284a', 'circle-stroke-width': 2 } })
    }
  }, [measure, ready])

  const measured = useMemo(() => {
    let d = 0
    for (let i = 1; i < measure.pts.length; i++) d += haversine(measure.pts[i - 1], measure.pts[i])
    return d
  }, [measure.pts])

  const focus = (id: string | null) => {
    setFocusLine(id)
    select(null, false)
    fitAll(id ? [id] : ALL)
  }
  const reset = () => {
    setFocusLine(null)
    select(null, false)
    mapRef.current?.flyTo({ center: HOME.center, zoom: HOME.zoom, pitch: 0, bearing: 0, duration: 700 })
  }
  const toggleTilt = () => {
    const m = mapRef.current
    if (!m) return
    m.easeTo({ pitch: m.getPitch() > 20 ? 0 : 55, bearing: m.getPitch() > 20 ? 0 : -15, duration: 700 })
  }
  const tour = () => {
    const m = mapRef.current
    if (!m) return
    if (stopTour.current) { stopTour.current(); return }
    setTouring(true)
    stopTour.current = startTour(m, selected ? { station: selected } : { line: focusLine ?? 'L1' }, () => { stopTour.current = null; setTouring(false) })
  }
  useEffect(() => () => stopTour.current?.(), [])
  const exportGeo = () => download('phnom-penh-rail-2050-network.geojson', JSON.stringify(buildExport(), null, 1), 'application/geo+json')
  const pickSearch = (i: { kind: string; id: string; at: LngLat }) => {
    if (i.kind === 'station') select(i.id)
    else mapRef.current?.flyTo({ center: i.at, zoom: i.kind === 'district' ? 13 : 15.5, duration: 700 })
  }

  const sel = selected ? stationById.get(selected) : null
  const layerLabel = (k: LayerKey) => t(`layer.${k}` as never)

  const panelBody = sel ? (
    <StationPanel s={sel} onBack={() => select(null, false)} />
  ) : (
    <>
      <div role="tablist" aria-label={t('map.panel')} className="grid grid-cols-3 border border-line-strong rounded-sm overflow-hidden mb-4">
        {(['lines', 'layers', 'legend'] as const).map(k => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-9 text-[13px] font-medium ${tab === k ? 'bg-navy-900 text-white' : 'bg-white hover:bg-panel'} ${k !== 'lines' ? 'border-l border-line-strong' : ''}`}
          >
            {t(k === 'lines' ? 'map.lines' : k === 'layers' ? 'map.layers' : 'map.legend')}
          </button>
        ))}
      </div>
      {tab === 'lines' && (
        <ul className="m-0 p-0 list-none">
          <li>
            <button type="button" onClick={() => focus(null)} aria-pressed={!focusLine} className={`w-full text-left px-3 py-2.5 border text-[13.5px] mb-2 rounded-sm ${!focusLine ? 'border-navy-900 bg-navy-50 font-medium' : 'border-line hover:bg-panel'}`}>
              {t('map.allLines')}
            </button>
          </li>
          {lines.map(l => (
            <li key={l.id}>
              <button type="button" onClick={() => focus(l.id)} aria-pressed={focusLine === l.id} className={`w-full text-left px-3 py-2.5 border mb-2 rounded-sm ${focusLine === l.id ? 'border-navy-900 bg-navy-50' : 'border-line hover:bg-panel'}`}>
                <span className="flex items-center justify-between gap-2 text-[13.5px] font-medium"><LineMark id={l.id} withName /><span className="font-mono text-muted text-[12.5px] font-normal">{km(l.lengthM)} {t('common.km')}</span></span>
                <span className="block text-[12.5px] text-muted mt-1">{name(stationById.get(l.stations[0])!)} to {name(stationById.get(l.stations[l.stations.length - 1])!)}, {num(l.stations.length)} {t('common.stations')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {tab === 'layers' && (
        <fieldset className="m-0 p-0 border-0">
          <legend className="text-[12px] uppercase tracking-wide text-muted mb-2">{t('map.basemap')}</legend>
          <div className="grid gap-1 mb-5">
            {BASEMAP_ORDER.map(b => (
              <label key={b} className="flex items-center gap-2 text-[13.5px] h-8 cursor-pointer">
                <input type="radio" name="basemap" checked={basemap === b} onChange={() => setBasemap(b)} className="accent-navy-900" />
                {t(`map.style.${b}` as never)}
              </label>
            ))}
          </div>
          <div className="text-[12px] uppercase tracking-wide text-muted mb-2">{t('map.layers')}</div>
          <div className="grid gap-1">
            {(Object.keys(LAYER_GROUPS) as LayerKey[]).map(k => (
              <label key={k} className="flex items-center gap-2 text-[13.5px] h-8 cursor-pointer">
                <input type="checkbox" checked={layers[k]} onChange={e => setLayers(v => ({ ...v, [k]: e.target.checked }))} className="accent-navy-900" />
                {layerLabel(k)}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {tab === 'legend' && <Legend />}
    </>
  )

  if (noWebgl) {
    return <div className="p-6 max-w-xl"><p className="border border-line bg-panel p-4">{t('map.noWebgl')}</p></div>
  }

  return (
    <div ref={wrap} className="absolute inset-0 flex bg-white sheet-offset">
      <aside className="hidden lg:flex flex-col w-[360px] shrink-0 border-r border-line bg-white min-h-0">
        <div className="p-4 border-b border-line"><SearchBox onPick={pickSearch} /></div>
        <div className="flex-1 overflow-y-auto p-4">{panelBody}</div>
      </aside>

      <div ref={mapArea} className="relative flex-1 min-w-0 bg-white">
        {/* MapLibre's own CSS makes its container position: relative, so the size is set inline on an inner element */}
        <div className="absolute inset-0"><div ref={el} style={{ width: '100%', height: '100%' }} role="region" aria-label={t('nav.map')} /></div>
        {!ready && <div className="absolute inset-0 grid place-items-center pointer-events-none"><span className="bg-white border border-line px-3 py-2 text-[13px]">{t('map.loading')}</span></div>}

        <div className="lg:hidden absolute top-3 left-3 right-[60px] z-10"><SearchBox onPick={pickSearch} /></div>

        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2" role="toolbar" aria-label="Map tools">
          <div className="hidden lg:block">
            <label htmlFor="basemap" className="sr-only">{t('map.basemap')}</label>
            <select id="basemap" value={basemap} onChange={e => setBasemap(e.target.value as BasemapId)} className="h-10 px-2 border border-line-strong rounded-sm bg-white text-[13px] w-[190px]">
              {BASEMAP_ORDER.map(b => <option key={b} value={b}>{t(`map.style.${b}` as never)}</option>)}
            </select>
          </div>
          <div className="flex flex-col self-end border border-line-strong rounded-sm bg-white overflow-hidden">
            <ToolButton label={t('map.fit')} onClick={() => fitAll(focusLine ? [focusLine] : ALL)}><Maximize2 size={17} /></ToolButton>
            <ToolButton label={t('map.reset')} onClick={reset}><RotateCcw size={17} /></ToolButton>
            <ToolButton label={t('map.tilt')} pressed={pitched} onClick={toggleTilt}><Box size={17} /></ToolButton>
            <ToolButton label={touring ? t('map.tourStop') : t('map.tour')} pressed={touring} onClick={tour}>{touring ? <Square size={15} /> : <Video size={17} />}</ToolButton>
            <ToolButton label={t('map.measure')} pressed={measure.on} onClick={() => setMeasure(m => (m.on ? { on: false, pts: m.pts } : { on: true, pts: [] }))}><Ruler size={17} /></ToolButton>
            <ToolButton label={t('map.export')} onClick={exportGeo}><Download size={17} /></ToolButton>
            <ToolButton label={t('map.layers')} className="lg:hidden" onClick={() => { setTab('layers'); select(null, false); setSheet(true) }}><Layers3 size={17} /></ToolButton>
          </div>
        </div>

        {(measure.on || measure.pts.length > 0) && (
          <div className="absolute z-10 left-3 top-[60px] lg:top-3 bg-white border border-line-strong rounded-sm px-3 py-2 text-[13px] max-w-[300px] shadow-sm" role="status">
            <div className="font-mono text-[15px] font-semibold">{measured >= 1000 ? `${(measured / 1000).toFixed(2)} km` : `${Math.round(measured)} m`}</div>
            {measure.on && <p className="text-muted text-[12.5px] mt-1">{t('map.measureHint')}</p>}
            <div className="flex gap-2 mt-2">
              {measure.on && <button type="button" className="h-8 px-3 border border-line-strong rounded-sm" onClick={() => setMeasure(m => ({ on: false, pts: m.pts }))}>{t('map.finish')}</button>}
              <button type="button" className="h-8 px-3 border border-line-strong rounded-sm" onClick={() => setMeasure({ on: false, pts: [] })}>{t('map.clear')}</button>
            </div>
          </div>
        )}

        {fallback && <div role="alert" className="absolute z-10 left-3 right-3 lg:right-auto lg:max-w-md bottom-24 lg:bottom-10 bg-warn-bg border border-[#ecd9ae] text-warn px-3 py-2 text-[13px]">{t('map.fallback')}</div>}

        <div className="absolute z-[5] left-[10px] bottom-[92px] lg:left-[150px] lg:bottom-[10px] flex items-center gap-1.5 bg-white/90 border border-line px-2 h-[22px] text-[11px] font-mono" aria-live="off">
          <Crosshair size={11} aria-hidden="true" /><span ref={coordRef}>{'\u00a0'}</span>
        </div>

        {/* bottom sheet on phones and tablets */}
        <section className={`lg:hidden absolute left-0 right-0 bottom-0 z-20 bg-white border-t border-line-strong shadow-[0_-2px_8px_rgba(0,0,0,0.08)] flex flex-col ${sheet ? 'h-[58%]' : 'h-[52px]'}`} aria-label={t('map.panel')}>
          <button type="button" className="h-[52px] shrink-0 flex items-center justify-between px-4 text-[14px] font-medium" aria-expanded={sheet} onClick={() => setSheet(s => !s)}>
            <span className="truncate">{sel ? name(sel) : focusLine ? name(lines.find(l => l.id === focusLine)!) : t('map.panel')}</span>
            <span className="flex items-center gap-2">
              {sel && <span role="button" tabIndex={0} aria-label={t('close')} onClick={e => { e.stopPropagation(); select(null, false) }} className="h-8 w-8 grid place-items-center border border-line rounded-sm"><X size={16} /></span>}
              {sheet ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </span>
          </button>
          {sheet && <div className="flex-1 overflow-y-auto px-4 pb-6 overscroll-contain">{panelBody}</div>}
        </section>
      </div>
    </div>
  )
}

function ToolButton({ label, onClick, children, pressed, className = '' }: { label: string; onClick: () => void; children: React.ReactNode; pressed?: boolean; className?: string }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={pressed} onClick={onClick} className={`w-10 h-10 grid place-items-center border-b border-line last:border-b-0 ${pressed ? 'bg-navy-900 text-white' : 'hover:bg-panel'} ${className}`}>
      {children}
    </button>
  )
}

export function Legend() {
  const { t } = useLang()
  const sample = '#1a3560'
  const row = (icon: React.ReactNode, label: string) => (
    <li className="flex items-center gap-3 h-8 text-[13.5px]"><span className="w-12 shrink-0 grid place-items-center">{icon}</span>{label}</li>
  )
  const lineSvg = (core?: 'solid' | 'dash', dashed?: boolean) => (
    <svg width="44" height="12" aria-hidden="true">
      <line x1="2" y1="6" x2="42" y2="6" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <line x1="2" y1="6" x2="42" y2="6" stroke={sample} strokeWidth="6" strokeDasharray={dashed ? '6 4' : undefined} />
      {core && <line x1="2" y1="6" x2="42" y2="6" stroke="#fff" strokeWidth="2" strokeDasharray={core === 'dash' ? '4 4' : undefined} />}
    </svg>
  )
  return (
    <div>
      <ul className="m-0 p-0 list-none">
        {row(lineSvg(), t('legend.underground'))}
        {row(lineSvg('solid'), t('legend.elevated'))}
        {row(lineSvg('dash'), t('legend.surface'))}
        {row(lineSvg(undefined, true), t('legend.extension'))}
        {row(<svg width="44" height="14" aria-hidden="true"><line x1="2" y1="7" x2="42" y2="7" stroke="#2f7fd1" strokeOpacity="0.35" strokeWidth="12" strokeLinecap="round" /><line x1="2" y1="7" x2="42" y2="7" stroke={sample} strokeWidth="5" /></svg>, t('legend.river'))}
        {row(<svg width="44" height="8" aria-hidden="true"><line x1="2" y1="4" x2="42" y2="4" stroke="#7a6a8f" strokeWidth="2" strokeDasharray="6 3" /></svg>, t('legend.railway'))}
        {row(<svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="5" fill="#fff" stroke={sample} strokeWidth="2.5" /></svg>, t('legend.station'))}
        {row(<svg width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#fff" stroke="#1b2430" strokeWidth="3" /></svg>, t('legend.interchange'))}
        {row(<svg width="16" height="16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill={sample} stroke="#fff" strokeWidth="2" /></svg>, t('legend.terminal'))}
        {row(<svg width="18" height="18" aria-hidden="true"><rect x="1" y="1" width="16" height="16" fill="#fff" stroke="#1b2430" strokeWidth="2" /><text x="9" y="13" textAnchor="middle" fontSize="10" fontWeight="600" fill="#1b2430">D</text></svg>, t('legend.depot'))}
      </ul>
      <ul className="m-0 p-0 list-none mt-4 border-t border-line pt-3">
        {lines.map(l => <li key={l.id} className="h-8 flex items-center text-[13.5px]"><LineMark id={l.id} withName /></li>)}
      </ul>
      <p className="text-[12.5px] text-muted mt-4">
        Alignments are preliminary proposals routed on OpenStreetMap road and railway geometry. They are not approved construction routes.
        {' '}{extensions.length} future extensions and {depots.length} candidate depot sites are shown for discussion.
      </p>
    </div>
  )
}

export function openStationOnMap(id: string) {
  navigate(`${import.meta.env.BASE_URL}map?station=${id}`)
}
