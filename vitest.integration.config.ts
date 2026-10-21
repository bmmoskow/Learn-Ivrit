import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import fs from 'fs';
import path from 'path';
import { assertSafeIntegrationTarget } from './src/test/integrationTargetGuard';

// Integration tests run the REAL Supabase client against a real database —
// either the LOCAL Docker stack (see docs/local-sandbox.md) or the remote TEST
// project. Never production: the guard below enforces that.
//
// IMPORTANT: we parse env files DIRECTLY rather than using Vite's loadEnv,
// because loadEnv gives process.env precedence over .env files — and this
// environment already exports VITE_SUPABASE_URL (pointing at PROD), which
// would silently override the file and make the tests hit production.
// Reading the file ourselves guarantees the intended target is used, and the
// values are injected via `define` so the client cannot fall back.
function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    /* handled below */
  }
  return out;
}

// Target resolution — two mutually exclusive sources, nothing else:
//   • Local (not CI): the LOCAL Docker sandbox, from .env.local ONLY. `.env`,
//     `.env.test`, and process.env are intentionally ignored, so a local run can
//     never be pointed at a real Supabase instance. `npm run sandbox:start`
//     boots the stack and writes .env.local (see docs/local-sandbox.md).
//   • CI: the remote TEST project, from env vars (VITE_SUPABASE_URL /
//     VITE_SUPABASE_ANON_KEY + EXPECTED_SUPABASE_PROJECT_REF), verified by the
//     positive allow-list in the guard below.
const isCI = !!process.env.CI;

let TEST_URL: string;
let TEST_ANON: string;
let expectedRef = '';

if (isCI) {
  TEST_URL = (process.env.VITE_SUPABASE_URL ?? '').trim();
  TEST_ANON = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  expectedRef = (process.env.EXPECTED_SUPABASE_PROJECT_REF ?? '').trim();
} else {
  const localEnv = parseEnvFile(path.resolve(process.cwd(), '.env.local'));
  TEST_URL = localEnv.VITE_SUPABASE_URL ?? '';
  TEST_ANON = localEnv.VITE_SUPABASE_ANON_KEY ?? '';
}

if (!TEST_URL || !TEST_ANON) {
  throw new Error(
    isCI
      ? 'Integration tests in CI need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and EXPECTED_SUPABASE_PROJECT_REF as env vars.'
      : 'Integration tests need the local sandbox. Run `npm run sandbox:start` to boot it and write .env.local (see docs/local-sandbox.md).'
  );
}

// Never let integration tests run against production. Locally the target must be
// the localhost sandbox; in CI it must match the allow-listed ref. (Logic +
// tests: src/test/integrationTargetGuard.ts)
assertSafeIntegrationTarget({ targetUrl: TEST_URL, expectedRef, isCI });

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(TEST_URL),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(TEST_ANON),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/integration-setup.ts'],
    include: ['src/**/*.integrationtest.{ts,tsx}'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: { VITE_SUPABASE_URL: TEST_URL, VITE_SUPABASE_ANON_KEY: TEST_ANON },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
