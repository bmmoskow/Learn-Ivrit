import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Two browser-test suites share this config and one web server:
//   • project "ui"  — real browser, MOCKED backend (tests/ui). Deterministic;
//     tests/support/mock-backend stubs all Supabase traffic, so no real backend
//     is needed regardless of which URL the app was built against.
//   • project "e2e" — real browser, REAL backend (tests/e2e). Hits the TEST
//     Supabase project in CI, or the LOCAL Docker sandbox when run locally.
//
// Build credentials for the served app:
//   • CI: VITE_* come from the job environment (the `pipeline` / test project).
//   • Local: parsed from .env.local, which `npm run sandbox:start` writes for
//     the local Docker Supabase stack — NOT from process.env, so a shell that
//     exports a prod URL can't leak into the build (the same guard the
//     integration tests use). Falls back to the local sandbox defaults when
//     .env.local is absent, which is harmless for the mocked UI suite.
const PORT = 4173;
const isCI = !!process.env.CI;

function readLocalEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const text = fs.readFileSync(path.resolve(__dirname, '.env.local'), 'utf8');
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[line.slice(0, eq).trim()] = val;
    }
  } catch {
    /* no .env.local — fall back below */
  }
  return out;
}

const local = isCI ? {} : readLocalEnv();
const buildEnv = {
  VITE_SUPABASE_URL:
    (isCI ? process.env.VITE_SUPABASE_URL : local.VITE_SUPABASE_URL) || 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY:
    (isCI ? process.env.VITE_SUPABASE_ANON_KEY : local.VITE_SUPABASE_ANON_KEY) || 'local-anon-key',
};

export default defineConfig({
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'ui', testDir: './tests/ui', use: { ...devices['Desktop Chrome'] } },
    { name: 'e2e', testDir: './tests/e2e', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build:dev && npm run deploy:prod -- --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: buildEnv,
  },
});
