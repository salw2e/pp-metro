import { useEffect, useRef, useState } from 'react'
import maplibregl from './maplibre'
import { BASEMAPS, fallbackStyle } from './basemaps'
import { installLabelImages } from './labels'
import { addOverlay, DEFAULT_LAYERS } from './overlay'
import { lineBounds, lines } from '../data/network'
import { useLang } from '../i18n'
import { href, navigate } from '../router'

/** Static overview of the network. It takes no gestures, so it never captures page scrolling. */
export function PreviewMap({ height = 420, print = false }: { height?: number | string; print?: boolean }) {
  const { lang, t } = useLang()
  const el = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!el.current) return
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: el.current,
        style: BASEMAPS.light.style,
        bounds: lineBounds(lines.map(l => l.id)) as [[number, number], [number, number]],
        fitBoundsOptions: { padding: 24 },
        interactive: false,
        attributionControl: { compact: true },
        canvasContextAttributes: { preserveDrawingBuffer: print },
      } as maplibregl.MapOptions)
    } catch { setFailed(true); return }
    installLabelImages(map)
    let loaded = false
    map.on('style.load', async () => {
      loaded = true
      await document.fonts.ready
      await addOverlay(map, { lang, layers: { ...DEFAULT_LAYERS, depots: false, labels: true }, focusLine: null, selected: null, transit: false })
      ;(window as unknown as { __ready: boolean }).__ready = true
    })
    const timer = setTimeout(() => { if (!loaded) map.setStyle(fallbackStyle, { diff: false }) }, 12000)
    return () => { clearTimeout(timer); map.remove() }
  }, [lang, print])
  if (failed) return <div className="border border-line bg-panel p-4 text-[13.5px]">{t('map.noWebgl')}</div>
  return (
    <div className="relative border border-line" style={{ height }}>
      <div className="absolute inset-0"><div ref={el} style={{ width: '100%', height: '100%' }} aria-label={t('nav.map')} role="img" /></div>
      {!print && (
        <button
          type="button"
          onClick={() => navigate(href('map'))}
          className="absolute left-3 top-3 h-9 px-3 bg-navy-900 text-white text-[13px] font-medium rounded-sm no-print"
        >
          {t('nav.map')}
        </button>
      )}
    </div>
  )
}
