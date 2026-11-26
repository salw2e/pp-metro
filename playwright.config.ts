import { defineConfig } from '@playwright/test'

// Uses the system Chrome with software WebGL so the map renders on servers without a GPU.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173/metro/',
    channel: process.env.PW_CHANNEL ?? 'chrome',
    launchOptions: { args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
    trace: 'off',
  },
  webServer: {
    command: 'pnpm vite preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/metro/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
