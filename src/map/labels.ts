import type { Map as MLMap } from 'maplibre-gl'

// MapLibre cannot shape Khmer script, so labels are drawn by the browser into images. An icon id has the form
// "lbl|<style>|<text>"; images are created the first time the map asks for them, including after a style change.

type LabelStyle = 'station' | 'major' | 'district' | 'landmark' | 'measure'

const STYLES: Record<LabelStyle, { size: number; weight: number; color: string; halo: string; upper?: boolean; box?: boolean }> = {
  station: { size: 12.5, weight: 500, color: '#1b2430', halo: '#ffffff' },
  major: { size: 13, weight: 600, color: '#0c1b33', halo: '#ffffff' },
  district: { size: 11.5, weight: 600, color: '#5d6877', halo: '#ffffff', upper: true },
  landmark: { size: 11, weight: 400, color: '#434d5a', halo: '#ffffff' },
  measure: { size: 12, weight: 600, color: '#ffffff', halo: '#12284a', box: true },
}

export const labelId = (style: LabelStyle, text: string) => `lbl|${style}|${text}`

const isKhmer = (s: string) => /[ក-៿]/.test(s)

function draw(style: LabelStyle, text: string) {
  const st = STYLES[style]
  const ratio = Math.min(3, Math.max(1, Math.ceil(devicePixelRatio || 1)))
  const family = isKhmer(text) ? '"Noto Sans Khmer", sans-serif' : '"IBM Plex Sans", sans-serif'
  const font = `${st.weight} ${st.size * ratio}px ${family}`
  const shown = st.upper && !isKhmer(text) ? text.toUpperCase() : text
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = font
  const m = probe.measureText(shown)
  const pad = (st.box ? 5 : 3) * ratio
  const ascent = m.actualBoundingBoxAscent || st.size * ratio * 0.8
  const descent = m.actualBoundingBoxDescent || st.size * ratio * 0.25
  const w = Math.ceil(m.width + pad * 2)
  const h = Math.ceil(ascent + descent + pad * 2)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  g.font = font
  g.textBaseline = 'alphabetic'
  if (st.upper) g.letterSpacing = `${0.6 * ratio}px`
  if (st.box) {
    g.fillStyle = st.halo
    g.fillRect(0, 0, w, h)
  } else {
    g.lineJoin = 'round'
    g.strokeStyle = st.halo
    g.lineWidth = 3 * ratio
    g.strokeText(shown, pad, pad + ascent)
  }
  g.fillStyle = st.color
  g.fillText(shown, pad, pad + ascent)
  return { data: g.getImageData(0, 0, w, h), ratio }
}

function drawDepot() {
  const r = 2
  const c = document.createElement('canvas')
  c.width = c.height = 18 * r
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, 18 * r, 18 * r)
  g.strokeStyle = '#1b2430'
  g.lineWidth = 2 * r
  g.strokeRect(r, r, 16 * r, 16 * r)
  g.fillStyle = '#1b2430'
  g.font = `600 ${10 * r}px "IBM Plex Sans", sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('D', 9 * r, 9.5 * r)
  return { data: g.getImageData(0, 0, 18 * r, 18 * r), ratio: r }
}

export function installLabelImages(map: MLMap) {
  // MapLibre 6 asks a resolver for images that are not in the style
  map.setMissingStyleImageResolver(id => {
    if (map.hasImage(id)) return
    if (id === 'depot') {
      const { data, ratio } = drawDepot()
      map.addImage(id, data, { pixelRatio: ratio })
      return
    }
    if (!id.startsWith('lbl|')) return
    const [, style, ...rest] = id.split('|')
    const { data, ratio } = draw(style as LabelStyle, rest.join('|'))
    map.addImage(id, data, { pixelRatio: ratio })
  })
}
