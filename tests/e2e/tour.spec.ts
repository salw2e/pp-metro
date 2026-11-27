import { test, expect } from '@playwright/test'
import { waitForMap, mapEval } from './helpers'

for (const width of [1440, 390]) test(`cinematic tour shows buildings and stops on interaction at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('map')
  await waitForMap(page)
  await page.getByRole('button', { name: 'Fly-through (line, or orbit the selected station)', exact: true }).click()
  await expect(page.locator('#basemap')).toHaveValue('3d')
  await page.waitForTimeout(12000)
  expect(await mapEval(page, m => m.getLayoutProperty('building-3d', 'visibility'))).toBe('visible')
  const zoom = await mapEval(page, m => m.getZoom())
  expect(zoom).toBeGreaterThan(15)
  await page.screenshot({ path: `/tmp/metro-tour-${width}.png` })
  await page.waitForTimeout(4000)
  expect(await mapEval(page, m => m.getZoom())).not.toBe(zoom)
  await page.locator('canvas.maplibregl-canvas').dispatchEvent('mousedown')
  await expect(page.getByRole('button', { name: 'Fly-through (line, or orbit the selected station)', exact: true })).toBeVisible()
  const stopped = await mapEval(page, m => m.getCenter())
  await page.waitForTimeout(500)
  expect(await mapEval(page, m => m.getCenter())).toEqual(stopped)
  expect(errors).toEqual([])
})

test('stop cancels the entry animation', async ({ page }) => {
  await page.goto('map')
  await waitForMap(page)
  await page.locator('#basemap').selectOption('3d')
  await page.waitForTimeout(3500)
  await page.getByRole('button', { name: 'Fly-through (line, or orbit the selected station)', exact: true }).click()
  await page.getByRole('button', { name: 'Stop fly-through', exact: true }).click()
  const center = await mapEval(page, m => m.getCenter())
  await page.waitForTimeout(2200)
  expect(await mapEval(page, m => m.getCenter())).toEqual(center)
})

test('zoom controls interrupt playback', async ({ page }) => {
  await page.goto('map')
  await waitForMap(page)
  await page.getByRole('button', { name: 'Fly-through (line, or orbit the selected station)', exact: true }).click()
  await page.waitForTimeout(6500)
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Fly-through (line, or orbit the selected station)', exact: true })).toBeVisible()
})

test('3D removes yellow road highlighting and duplicate routes, restoring streets in 2D', async ({ page }) => {
  await page.goto('map')
  await waitForMap(page)
  await page.locator('#basemap').selectOption('3d')
  await page.waitForTimeout(4500)
  const inspect = () => page.evaluate(() => {
    const m = (window as unknown as { __map: import('maplibre-gl').Map }).__map
    return { road: m.getPaintProperty('road_trunk_primary', 'line-color'), casing: m.getLayoutProperty('road_trunk_primary_casing', 'visibility'), duplicate: !!m.getLayer('net-xray') }
  })
  expect(await inspect()).toEqual({ road: '#f1f2f3', casing: 'none', duplicate: false })
  await page.getByRole('button', { name: '3D tilt', exact: true }).click()
  await expect.poll(async () => (await inspect()).casing, { timeout: 10_000 }).toBe('visible')
  expect((await inspect()).road).not.toBe('#f1f2f3')
})
