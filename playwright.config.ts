import { defineConfig, devices } from '@playwright/test'

const porta = process.env.E2E_PORT ?? '4173'
const comPortaPropria = porta !== '4173'
const pasta = `artifacts/e2e/build-${porta}`

export default defineConfig({
  testDir: './e2e',
  outputDir: 'artifacts/e2e/results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: 'artifacts/e2e/report' }]]
    : 'list',
  use: {
    baseURL: `http://localhost:${porta}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Telas do parceiro (marcadas com @celular) num celular de 360 px e num tablet em pé.
    {
      name: 'celular',
      grep: /@celular/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 740 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
      grep: /@celular/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: comPortaPropria
      ? `npx vite build --outDir ${pasta} --emptyOutDir && npx vite preview --outDir ${pasta} --port ${porta} --strictPort`
      : 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: `http://localhost:${porta}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
