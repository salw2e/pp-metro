import { test, expect } from '@playwright/test'
import { watchConsole, noHorizontalOverflow, waitForMap } from './helpers'

const PAGES = [
  ['', 'Executive Summary'],
  ['lines', 'Metro Lines'],
  ['stations', 'Station Directory'],
  ['engineering', 'Engineering'],
  ['finance', 'Financial Assessment'],
  ['roadmap', 'Implementation'],
  ['environment', 'Environment and Social'],
  ['references', 'References'],
  ['submission', 'Submission'],
]

for (const vp of [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 768, height: 1024 }, { width: 440, height: 956 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
  test.describe(`${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp })
    for (const [path, title] of PAGES) {
      test(`${path || 'summary'} renders without errors or overflow`, async ({ page }) => {
        const errors = watchConsole(page)
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
        if (path === '') await waitForMap(page)
        await noHorizontalOverflow(page)
        expect(errors).toEqual([])
      })
    }
    test('map page renders', async ({ page }) => {
      const errors = watchConsole(page)
      await page.goto('map')
      await waitForMap(page)
      await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
      await noHorizontalOverflow(page)
      expect(errors).toEqual([])
    })
  })
}

test('navigation links reach every page and mark the current one', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('')
  for (const [path, title] of PAGES.slice(1)) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: title, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/metro/${path}$`))
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
    await expect(page.getByRole('link', { name: title, exact: true })).toHaveAttribute('aria-current', 'page')
  }
})

test('mobile menu opens, navigates and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('')
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Station Directory' }).click()
  await expect(page).toHaveURL(/\/metro\/stations$/)
  await expect(page.getByRole('button', { name: 'Close' })).toHaveCount(0)
})

test('language switch changes the interface and is remembered', async ({ page }) => {
  await page.goto('lines')
  await page.getByRole('button', { name: 'ខ្មែរ' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'km')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ខ្សែរថភ្លើង')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ខ្សែរថភ្លើង')
  await page.getByRole('button', { name: 'EN' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('unknown address shows the not-found page', async ({ page }) => {
  await page.goto('no-such-page')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found')
})

test('every external reference link is a well-formed https URL and every citation resolves', async ({ page }) => {
  await page.goto('references')
  const hrefs = await page.locator('main ol a[target=_blank]').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).href))
  expect(hrefs.length).toBeGreaterThan(20)
  for (const h of hrefs) expect(h).toMatch(/^https:\/\/[^\s]+$/)
  for (const path of ['', 'lines', 'engineering', 'finance', 'environment', 'submission']) {
    await page.goto(path)
    const cites = await page.locator('a[href*="/metro/references#R"]').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).hash.slice(1)))
    await page.goto('references')
    for (const id of new Set(cites)) await expect(page.locator(`[id="${id}"]`)).toHaveCount(1)
  }
})

test('internal links do not lead to the not-found page', async ({ page }) => {
  const seen = new Set<string>()
  for (const path of ['', 'lines', 'stations', 'submission']) {
    await page.goto(path)
    const links = await page.locator('a[href^="/metro"]').evaluateAll(as => as.map(a => (a as HTMLAnchorElement).pathname))
    for (const l of links) seen.add(l)
  }
  for (const l of seen) {
    await page.goto(l.replace(/^\/metro\//, ''))
    await expect(page.getByRole('heading', { name: 'Page not found' })).toHaveCount(0)
  }
})
