import { defineConfig, devices } from '@playwright/test';

// Playwright E2E config. Tests live in ./e2e and drive the PRODUCTION build of
// the app in a real browser — the one thing the jsdom unit/integration tests
// can't cover (the built bundle, real rendering/navigation, the assembled app).
//
// The webServer builds the app and serves it with `vite preview`; the build
// reads VITE_SUPABASE_* from the environment (in CI, the `pipeline`/test
// project — see .github/workflows/ui.yml), so the client points at the test
// backend, never prod.
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Fail the build if a test was left with `.only` committed.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build:dev && npm run deploy:prod -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
