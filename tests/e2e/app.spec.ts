import { test, expect, type Download } from '@playwright/test'
import { waitForMap, watchConsole } from './helpers'
import network from '../../src/data/network.json' with { type: 'json' }
import { computeCost } from '../../src/lib/cost'
import { defaultInputs, lineLengthsKm } from '../../src/lib/scenario'

test.use({ viewport: { width: 1440, height: 900 } })

const text = async (d: Download) => Buffer.concat(await (await d.createReadStream()).toArray()).toString('utf8')

test('station directory filters, sorts and opens a station on the map', async ({ page }) => {
  await page.goto('stations')
  await expect(page.getByText(`${network.stations.length} stations`)).toBeVisible()
  await page.getByLabel('Filter by name, code or district').fill('kbal')
  await expect(page.getByText('1 stations')).toBeVisible()
  await page.getByLabel('Filter by name, code or district').fill('')
  await page.getByLabel('Line').selectOption('L4')
  const l4 = network.stations.filter(s => s.lines.includes('L4')).length
  await expect(page.getByText(`${l4} stations`)).toBeVisible()
  await page.getByLabel('Line').selectOption('')
  // sort by name descending
  await page.getByRole('button', { name: /^Name/ }).click()
  await page.getByRole('button', { name: /^Name/ }).click()
  const first = await page.locator('tbody tr td:nth-child(3) span.font-medium').first().innerText()
  const names = network.stations.map(s => s.en).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
  expect(first).toBe(names[0])
  // expand details, then open on the map
  await page.getByRole('button', { name: 'Kbal Thnal details' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Kbal Thnal' })).toBeVisible()
  await page.getByRole('row', { name: /Kbal Thnal/ }).first().getByRole('button', { name: 'Show on map' }).click()
  await expect(page).toHaveURL(/\/map\?station=kbalthnal/)
  await waitForMap(page)
  await expect(page.getByRole('heading', { level: 2, name: 'Kbal Thnal' })).toBeVisible()
  const sel = await page.evaluate(() => (window as unknown as { __map: { getFilter(id: string): unknown } }).__map.getFilter('st-selected'))
  expect(JSON.stringify(sel)).toContain('kbalthnal')
})

test('stations CSV download contains every station with Khmer names', async ({ page }) => {
  await page.goto('stations')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download CSV' }).click()])
  const csv = await text(dl)
  const rows = csv.replace(/^﻿/, '').trim().split('\r\n')
  expect(rows[0]).toContain('name_km')
  expect(rows.length).toBe(network.stations.length + 1)
  expect(csv).toContain('វត្តភ្នំ')
})

test('financial tool: base case matches the model, inputs recalculate, presets order', async ({ page }) => {
  const errors = watchConsole(page)
  await page.goto('finance')
  const expected = computeCost(defaultInputs('base'), lineLengthsKm())
  const heading = page.getByText(/^US\$ [\d.]+ bn$/)
  await expect(heading).toHaveText(`US$ ${(expected.real / 1000).toFixed(2)} bn`)
  // doubling the underground rate raises the total by the tunnel cost times the on-cost multipliers
  const ug = page.getByLabel(/Underground per km/)
  await ug.fill('260')
  const i = defaultInputs('base')
  const changed = computeCost({ ...i, ugPerKm: 260 }, lineLengthsKm())
  await expect(heading).toHaveText(`US$ ${(changed.real / 1000).toFixed(2)} bn`)
  await expect(page.getByText('Custom values')).toBeVisible()
  await page.getByRole('button', { name: 'High' }).click()
  const high = parseFloat((await heading.innerText()).replace(/[^\d.]/g, ''))
  await page.getByRole('button', { name: 'Low' }).click()
  const low = parseFloat((await heading.innerText()).replace(/[^\d.]/g, ''))
  expect(high).toBeGreaterThan(low)
  // removing a line reduces quantities and cost
  await page.getByRole('button', { name: 'Reset' }).click()
  await page.getByRole('checkbox', { name: /Northwest Line/ }).uncheck()
  const without = parseFloat((await heading.innerText()).replace(/[^\d.]/g, ''))
  expect(without).toBeLessThan(expected.real / 1000)
  // fare scenario
  await page.getByLabel(/Riders per day/).fill('200000')
  await expect(page.getByText('US$ 36.5 m')).toBeVisible()
  expect(errors).toEqual([])
})

test('submission: author details fill the Khmer letter; downloads work', async ({ page }) => {
  await page.goto('submission')
  await page.getByLabel('Author name').fill('Sok Dara')
  await page.getByLabel('Submission date').fill('2026-12-01')
  const letter = page.getByRole('article', { name: 'Khmer letter' })
  await expect(letter).toContainText('Sok Dara')
  await expect(letter).toContainText('ថ្ងៃទី១ ខែធ្នូ ឆ្នាំ២០២៦')
  await expect(letter).toContainText('សម្តេចមហាបវរធិបតី ហ៊ុន ម៉ាណែត')
  await page.reload()
  await expect(page.getByLabel('Author name')).toHaveValue('Sok Dara')
  for (const [name, file] of [['GeoJSON', '.geojson'], ['Stations CSV', 'stations.csv'], ['Lines CSV', 'lines.csv']]) {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()])
    expect(dl.suggestedFilename()).toContain(file)
    expect((await text(dl)).length).toBeGreaterThan(200)
  }
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'A3 network map' }).click()])
  await waitForMap(popup)
  await expect(popup.getByRole('heading', { level: 1 })).toContainText('Phnom Penh Metropolitan Rail Master Plan 2050')
})

test('print view hides navigation and uses A4 pages', async ({ page }) => {
  await page.goto('submission')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden()
  await expect(page.getByRole('article', { name: 'Khmer letter' })).toBeVisible()
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  expect(pdf.length).toBeGreaterThan(50_000)
})

test('lines page "Show on map" focuses that line', async ({ page }) => {
  await page.goto('lines')
  await page.locator('#L3').getByRole('button', { name: 'Show on map' }).click()
  await expect(page).toHaveURL(/\/map\?line=L3/)
  await waitForMap(page)
  await expect(page.getByRole('button', { name: /Southwest–East Line/ })).toHaveAttribute('aria-pressed', 'true')
})

test('keyboard users can reach the main navigation and search', async ({ page }) => {
  await page.goto('map')
  await waitForMap(page)
  await page.keyboard.press('Tab')
  await expect(page.getByText('Skip to content')).toBeFocused()
  const search = page.getByRole('combobox', { name: 'Search stations, districts, landmarks' }).first()
  await search.focus()
  await page.keyboard.type('Wat Ph')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 2, name: 'Wat Phnom' })).toBeVisible()
})
