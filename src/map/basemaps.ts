import type { StyleSpecification } from 'maplibre-gl'

export type BasemapId = 'streets' | 'light' | 'satellite' | '3d' | 'transit'

const env = import.meta.env
const OFM = 'https://tiles.openfreemap.org/styles'
export const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

const SATELLITE_TILES = env.VITE_SATELLITE_TILES || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTRIBUTION = env.VITE_SATELLITE_ATTRIBUTION || 'Imagery © Esri, Maxar, Earthstar Geographics and the GIS User Community'

const satellite: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    imagery: { type: 'raster', tiles: [SATELLITE_TILES], tileSize: 256, maxzoom: 19, attribution: SATELLITE_ATTRIBUTION },
    reference: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#1f2a33' } },
    { id: 'imagery', type: 'raster', source: 'imagery' },
    { id: 'reference', type: 'raster', source: 'reference', paint: { 'raster-opacity': 0.75 } },
  ],
}

/** Raster OpenStreetMap tiles, used only when the vector base map fails to load. */
export const fallbackStyle: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: {
    osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap contributors' },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#eef0f2' } },
    { id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-saturation': -0.4 } },
  ],
}

export const BASEMAPS: Record<BasemapId, { style: string | StyleSpecification; pitch?: number }> = {
  streets: { style: env.VITE_STYLE_STREETS || `${OFM}/liberty` },
  light: { style: env.VITE_STYLE_LIGHT || `${OFM}/positron` },
  satellite: { style: satellite },
  '3d': { style: env.VITE_STYLE_STREETS || `${OFM}/liberty`, pitch: 58 },
  transit: { style: env.VITE_STYLE_LIGHT || `${OFM}/positron` },
}

export const BASEMAP_ORDER: BasemapId[] = ['light', 'streets', 'satellite', '3d', 'transit']
