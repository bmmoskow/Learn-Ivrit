import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import fs from 'fs';
import path from 'path';

// Integration tests run the REAL Supabase client against the TEST project.
//
// IMPORTANT: we parse .env.test DIRECTLY rather than using Vite's loadEnv,
// because loadEnv gives process.env precedence over .env files — and this
// environment already exports VITE_SUPABASE_URL (pointing at PROD), which
// would silently override .env.test and make the tests hit production.
// Reading the file ourselves guarantees the test project is used, and the
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

// Prefer .env.test when present (local dev — bypasses the polluted process.env
// described above). Fall back to process.env when it isn't (CI, where the test
// project's URL/key arrive as environment secrets, and there's no pollution).
const fileEnv = parseEnvFile(path.resolve(process.cwd(), '.env.test'));
const TEST_URL = fileEnv.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const TEST_ANON = fileEnv.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!TEST_URL || !TEST_ANON) {
  throw new Error(
    'Integration tests need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY — in .env.test locally (see .env.test.example), or as env vars in CI.'
  );
}
// Guard: never let integration tests run against production — without hard-coding
// any project ref in source.
//   - If EXPECTED_SUPABASE_PROJECT_REF is set (a PUBLIC repo/env variable, passed
//     by CI; may also be set locally), the target URL MUST contain it — a positive
//     allow-list. This is the primary CI guard.
//   - In CI with no expected ref configured, we can't verify the target, so we
//     FAIL CLOSED rather than risk hitting production.
//   - Locally (not CI), we also refuse the prod project identified by
//     VITE_SUPABASE_URL in .env.
const expectedRef = (process.env.EXPECTED_SUPABASE_PROJECT_REF ?? '').trim();
const isCI = !!process.env.CI;
if (expectedRef) {
  if (!TEST_URL.includes(expectedRef)) {
    throw new Error(
      `Refusing: integration-test target (${TEST_URL}) is not the expected project (EXPECTED_SUPABASE_PROJECT_REF=${expectedRef}).`
    );
  }
} else if (isCI) {
  throw new Error(
    'Refusing: in CI you must set the SUPABASE_TEST_PROJECT_REF variable (passed as EXPECTED_SUPABASE_PROJECT_REF) so the integration-test target can be verified as non-production.'
  );
} else {
  const prodEnv = parseEnvFile(path.resolve(process.cwd(), '.env'));
  const PROD_URL = prodEnv.VITE_SUPABASE_URL ?? '';
  if (PROD_URL && TEST_URL === PROD_URL) {
    throw new Error(
      'Refusing to run integration tests against the production Supabase project (it matches VITE_SUPABASE_URL in .env). Point .env.test at the test project.'
    );
  }
}

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
