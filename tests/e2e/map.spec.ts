import { test, expect, type Page } from '@playwright/test'
import { watchConsole, waitForMap, mapEval, settle } from './helpers'
import network from '../../src/data/network.json' with { type: 'json' }

test.use({ viewport: { width: 1440, height: 900 } })

async function openMap(page: Page, query = '') {
  const tiles: number[] = []
  page.on('response', r => { if (/tiles\.openfreemap\.org\/.*\.pbf|planet/.test(r.url())) tiles.push(r.status()) })
  await page.goto(`map${query}`)
  await waitForMap(page)
  return tiles
}

async function mapBox(page: Page) {
  const b = await page.locator('canvas.maplibregl-canvas').boundingBox()
  if (!b) throw new Error('no canvas')
  return b
}

test('base map tiles load and the network layers are present', async ({ page }) => {
  const errors = watchConsole(page)
  const tiles = await openMap(page)
  expect(tiles.length).toBeGreaterThan(0)
  expect(tiles.every(s => s === 200 || s === 204)).toBe(true)
  for (const id of ['net-line', 'st-circle', 'st-ring', 'st-label', 'ext-line', 'depot-icon', 'river-x', 'rail-line']) {
    expect(await page.evaluate(i => !!(window as unknown as { __map: { getLayer(id: string): unknown } }).__map.getLayer(i), id)).toBe(true)
  }
  // the canvas actually draws something other than a blank background
  const nonBlank = await page.evaluate(() => {
    const c = document.querySelector('canvas.maplibregl-canvas') as HTMLCanvasElement
    const g = document.createElement('canvas'); g.width = 64; g.height = 64
    const x = g.getContext('2d')!; x.drawImage(c, 0, 0, 64, 64)
    const d = x.getImageData(0, 0, 64, 64).data
    const colours = new Set<number>()
    for (let i = 0; i < d.length; i += 16) colours.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])
    return colours.size
  })
  expect(nonBlank).toBeGreaterThan(20)
  expect(errors).toEqual([])
})

test('mouse drag pans the map', async ({ page }) => {
  await openMap(page)
  await settle(page)
  const before = await mapEval(page, m => m.getCenter())
  const b = await mapBox(page)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 - 200, b.y + b.height / 2 - 120, { steps: 12 })
  await page.mouse.up()
  await settle(page)
  const after = await mapEval(page, m => m.getCenter())
  expect(after.lng).toBeGreaterThan(before.lng)
  expect(after.lat).toBeLessThan(before.lat)
})

test('mouse wheel and double-click zoom in', async ({ page }) => {
  await openMap(page)
  await settle(page)
  const z0 = await mapEval(page, m => m.getZoom())
  const b = await mapBox(page)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.wheel(0, -600)
  await settle(page)
  const z1 = await mapEval(page, m => m.getZoom())
  expect(z1).toBeGreaterThan(z0 + 0.3)
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2)
  await settle(page)
  expect(await mapEval(page, m => m.getZoom())).toBeGreaterThan(z1 + 0.5)
})

test('tilt button and zoom controls work; reset restores the camera', async ({ page }) => {
  await openMap(page)
  await page.getByRole('button', { name: '3D tilt' }).click()
  await settle(page)
  expect(await mapEval(page, m => m.getPitch())).toBeGreaterThan(40)
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await settle(page)
  await page.getByRole('button', { name: 'Reset view' }).click()
  await settle(page)
  expect(await mapEval(page, m => m.getPitch())).toBeLessThan(1)
  expect(Math.abs((await mapEval(page, m => m.getZoom())) - 10.6)).toBeLessThan(0.05)
})

test('clicking a station on the map opens its information panel', async ({ page }) => {
  await openMap(page)
  await page.getByRole('button', { name: 'Reset view' }).click()
  await settle(page)
  await page.evaluate(() => (window as unknown as { __map: { jumpTo(o: object): void } }).__map.jumpTo({ center: [104.9218, 11.5748], zoom: 14 }))
  await settle(page)
  const p = await mapEval(page, m => m.project([104.9218, 11.5748]))
  const b = await mapBox(page)
  // click the rendered station nearest Wat Phnom
  const target = await page.evaluate(() => {
    const m = (window as unknown as { __map: { queryRenderedFeatures(o: object): { properties: { id: string }; geometry: { coordinates: [number, number] } }[]; project(c: [number, number]): { x: number; y: number } } }).__map
    const f = m.queryRenderedFeatures({ layers: ['st-circle', 'st-ring'] }).find(x => x.properties.id === 'watphnom')!
    return m.project(f.geometry.coordinates)
  })
  expect(Math.abs(target.x - p.x)).toBeLessThan(80)
  await page.mouse.click(b.x + target.x, b.y + target.y)
  await expect(page.getByRole('heading', { level: 2, name: 'Wat Phnom' })).toBeVisible()
  await expect(page).toHaveURL(/station=watphnom/)
  await expect(page.getByText('Planning justification')).toBeVisible()
  await expect(page.getByText('Verification status')).toBeVisible()
})

test('hovering a station shows its name', async ({ page }) => {
  await openMap(page, '?line=L1')
  await settle(page)
  const pt = await page.evaluate(() => {
    const m = (window as unknown as { __map: { queryRenderedFeatures(o: object): { properties: { en: string }; geometry: { coordinates: [number, number] } }[]; project(c: [number, number]): { x: number; y: number } } }).__map
    const f = m.queryRenderedFeatures({ layers: ['st-circle'] })[0]
    return { ...m.project(f.geometry.coordinates), name: f.properties.en }
  })
  const b = await mapBox(page)
  await page.mouse.move(b.x + pt.x, b.y + pt.y)
  await expect(page.locator('.maplibregl-popup')).toContainText(pt.name)
})

test('search finds a station, a district and a landmark', async ({ page }) => {
  await openMap(page)
  const box = page.getByRole('combobox', { name: 'Search stations, districts, landmarks' }).first()
  await box.fill('kbal')
  await box.press('ArrowDown')
  await box.press('Enter')
  await expect(page.getByRole('heading', { level: 2, name: 'Kbal Thnal' })).toBeVisible()
  await box.fill('Sen Sok')
  await expect(page.getByRole('option').filter({ hasText: 'District' }).first()).toBeVisible()
  await box.fill('Calmette Hospital')
  await page.getByRole('option').filter({ hasText: 'Calmette Hospital' }).first().click()
  await settle(page)
  const c = await mapEval(page, m => m.getCenter())
  expect(Math.abs(c.lng - 104.9157)).toBeLessThan(0.01)
  expect(Math.abs(c.lat - 11.5814)).toBeLessThan(0.01)
})

test('focusing a line fits the map to it; whole network fits everything', async ({ page }) => {
  await openMap(page)
  await page.getByRole('button', { name: /East–West Line/ }).click()
  await settle(page)
  const b = await mapEval(page, m => ({ w: m.getBounds().getWest(), e: m.getBounds().getEast(), s: m.getBounds().getSouth(), n: m.getBounds().getNorth() }))
  // Line 2 runs from Chom Chao (104.83) to Chroy Changvar (104.93) and does not go south of 11.53
  expect(b.w).toBeLessThan(104.832)
  expect(b.e).toBeGreaterThan(104.928)
  expect(b.s).toBeGreaterThan(11.45)
  await page.getByRole('button', { name: 'Whole network' }).click()
  await settle(page)
  const all = await mapEval(page, m => m.getBounds().getSouth())
  expect(all).toBeLessThan(11.36) // includes Techo International Airport
})

test('layer toggles hide and show layers', async ({ page }) => {
  await openMap(page)
  await page.getByRole('tab', { name: 'Layers' }).click()
  const lines = page.getByRole('checkbox', { name: 'Proposed lines' })
  await lines.uncheck()
  expect(await mapEval(page, m => m.getLayoutProperty('net-line', 'visibility'))).toBe('none')
  await lines.check()
  expect(await mapEval(page, m => m.getLayoutProperty('net-line', 'visibility'))).toBe('visible')
  const districts = page.getByRole('checkbox', { name: 'District boundaries' })
  await districts.check()
  expect(await mapEval(page, m => m.getLayoutProperty('district-line', 'visibility'))).toBe('visible')
})

test('each base map loads and keeps the network overlay', async ({ page }) => {
  await openMap(page)
  for (const label of ['Street map', 'Satellite', '3D city view', 'Transit network', 'Light planning map']) {
    await page.evaluate(() => { (window as unknown as { __ready: boolean }).__ready = false })
    await page.getByRole('combobox', { name: 'Base map' }).selectOption({ label })
    await waitForMap(page)
    expect(await page.evaluate(() => !!(window as unknown as { __map: { getLayer(i: string): unknown } }).__map.getLayer('net-line')), label).toBe(true)
  }
})

test('the measuring tool reports the great-circle distance between clicks', async ({ page }) => {
  await openMap(page)
  await page.evaluate(() => (window as unknown as { __map: { jumpTo(o: object): void } }).__map.jumpTo({ center: [104.92, 11.56], zoom: 13 }))
  await settle(page)
  await page.getByRole('button', { name: 'Measure distance' }).click()
  const b = await mapBox(page)
  const a = { x: b.x + 300, y: b.y + 300 }
  const c = { x: b.x + 700, y: b.y + 300 }
  await page.mouse.click(a.x, a.y)
  await page.mouse.click(c.x, c.y)
  const expected = await page.evaluate(([p, q]) => {
    const m = (window as unknown as { __map: { unproject(p: [number, number]): { lng: number; lat: number; distanceTo(o: unknown): number } } }).__map
    return m.unproject(p).distanceTo(m.unproject(q))
  }, [[300, 300], [700, 300]] as [number, number][])
  const shown = await page.getByRole('status').filter({ hasText: /km|m$/ }).first().locator('div').first().innerText()
  const metres = shown.endsWith('km') ? parseFloat(shown) * 1000 : parseFloat(shown)
  expect(Math.abs(metres - expected) / expected).toBeLessThan(0.01)
  await page.getByRole('button', { name: 'Finish' }).click()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(0)
})

test('coordinates follow the pointer', async ({ page }) => {
  await openMap(page)
  const b = await mapBox(page)
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  const c = await mapEval(page, m => m.getCenter())
  await expect(page.getByText(new RegExp(`${c.lat.toFixed(2)}\\d+° N`))).toBeVisible()
})

test('GeoJSON export downloads the network', async ({ page }) => {
  await openMap(page)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export GeoJSON' }).click()])
  expect(dl.suggestedFilename()).toBe('phnom-penh-rail-2050-network.geojson')
  const fc = JSON.parse(await (await dl.createReadStream()).toArray().then(b => Buffer.concat(b).toString('utf8')))
  expect(fc.type).toBe('FeatureCollection')
  expect(fc.features.filter((f: { properties: { feature: string } }) => f.properties.feature === 'station').length).toBe(network.stations.length)
  expect(fc.metadata.status).toMatch(/Preliminary/)
})

test('fullscreen button toggles full screen', async ({ page }) => {
  await openMap(page)
  await page.getByRole('button', { name: 'Enter fullscreen' }).click()
  await expect(page.getByRole('button', { name: 'Exit fullscreen' })).toBeVisible()
  await page.getByRole('button', { name: 'Exit fullscreen' }).click()
  await expect(page.getByRole('button', { name: 'Enter fullscreen' })).toBeVisible()
})

test('a failed base map style falls back to raster tiles with a notice', async ({ page }) => {
  await page.route('**/tiles.openfreemap.org/styles/**', r => r.abort())
  await page.goto('map')
  await expect(page.getByRole('alert')).toContainText('could not be loaded')
  await waitForMap(page)
  expect(await page.evaluate(() => !!(window as unknown as { __map: { getLayer(i: string): unknown } }).__map.getLayer('net-line'))).toBe(true)
})
