import { test, expect, type Page } from '@playwright/test'
import { waitForMap, mapEval, settle, noHorizontalOverflow } from './helpers'

// iPhone 16 Pro Max CSS viewport
test.use({ viewport: { width: 440, height: 956 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })

type Pt = { x: number; y: number }

async function touch(page: Page, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Pt[]) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, i) => ({ x: p.x, y: p.y, id: i })) })
  await cdp.detach()
}

async function gesture(page: Page, from: Pt[], to: Pt[], steps = 12) {
  await touch(page, 'touchStart', from)
  for (let s = 1; s <= steps; s++) {
    await touch(page, 'touchMove', from.map((p, i) => ({ x: p.x + ((to[i].x - p.x) * s) / steps, y: p.y + ((to[i].y - p.y) * s) / steps })))
    await page.waitForTimeout(16)
  }
  await touch(page, 'touchEnd', [])
}

async function centre(page: Page) {
  const b = (await page.locator('canvas.maplibregl-canvas').boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 - 60 }
}

test('one-finger drag pans the map without scrolling the page', async ({ page }) => {
  await page.goto('map')
  await waitForMap(page)
  await settle(page)
  const before = await mapEval(page, m => m.getCenter())
  const c = await centre(page)
  await gesture(page, [c], [{ x: c.x - 120, y: c.y - 160 }])
  await settle(page)
  const after = await mapEval(page, m => m.getCenter())
  expect(after.lng).toBeGreaterThan(before.lng)
  expect(after.lat).toBeLessThan(before.lat)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('two-finger pinch zooms in and out', async ({ page }) => {
  await page.goto('map')
  await waitForMap(page)
  await settle(page)
  const z0 = await mapEval(page, m => m.getZoom())
  const c = await centre(page)
  await gesture(page, [{ x: c.x - 30, y: c.y }, { x: c.x + 30, y: c.y }], [{ x: c.x - 150, y: c.y }, { x: c.x + 150, y: c.y }])
  await settle(page)
  const z1 = await mapEval(page, m => m.getZoom())
  expect(z1).toBeGreaterThan(z0 + 1)
  await gesture(page, [{ x: c.x - 150, y: c.y }, { x: c.x + 150, y: c.y }], [{ x: c.x - 40, y: c.y }, { x: c.x + 40, y: c.y }])
  await settle(page)
  expect(await mapEval(page, m => m.getZoom())).toBeLessThan(z1 - 1)
})

test('tapping a station opens the bottom sheet with its details', async ({ page }) => {
  await page.goto('map?line=L2')
  await waitForMap(page)
  await settle(page)
  const pt = await page.evaluate(() => {
    const m = (window as unknown as { __map: { queryRenderedFeatures(o: object): { properties: { id: string; en: string }; geometry: { coordinates: [number, number] } }[]; project(c: [number, number]): { x: number; y: number } } }).__map
    const f = m.queryRenderedFeatures({ layers: ['st-ring'] }).find(x => x.properties.id === 'centralmarket')!
    return m.project(f.geometry.coordinates)
  })
  const b = (await page.locator('canvas.maplibregl-canvas').boundingBox())!
  await page.touchscreen.tap(b.x + pt.x, b.y + pt.y)
  await expect(page.getByRole('heading', { level: 2, name: 'Central Market' })).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Central Market' })).toHaveCount(0)
})

test('bottom sheet opens the layer list and the map tools stay reachable', async ({ page }) => {
  await page.goto('map')
  await waitForMap(page)
  await page.getByRole('button', { name: 'Layers' }).click()
  await expect(page.getByRole('checkbox', { name: 'Proposed lines' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Measure distance' })).toBeInViewport()
  await expect(page.locator('.maplibregl-ctrl-scale')).toBeInViewport()
  await noHorizontalOverflow(page)
})
