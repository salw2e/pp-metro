import { expect, type Page } from '@playwright/test'

/** Collects console errors and failed requests other than base-map tiles. */
export function watchConsole(page: Page) {
  const errors: string[] = []
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', e => errors.push(e.message))
  return errors
}

export async function waitForMap(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, null, { timeout: 60_000 })
  // let tiles and label images settle
  await page.waitForTimeout(1500)
}

export async function noHorizontalOverflow(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over, 'horizontal overflow in px').toBeLessThanOrEqual(0)
}

type MapHandle = { getCenter(): { lng: number; lat: number }; getZoom(): number; getPitch(): number; project(p: [number, number]): { x: number; y: number }; getLayoutProperty(id: string, p: string): unknown; getBounds(): { getWest(): number; getEast(): number; getNorth(): number; getSouth(): number }; isMoving(): boolean }
export const mapEval = <T>(page: Page, fn: (m: MapHandle) => T) => page.evaluate(`(${fn.toString()})(window.__map)`) as Promise<T>

export async function settle(page: Page) {
  await page.waitForFunction(() => !(window as unknown as { __map: { isMoving(): boolean } }).__map.isMoving(), null, { timeout: 15_000 })
  await page.waitForTimeout(300)
}
