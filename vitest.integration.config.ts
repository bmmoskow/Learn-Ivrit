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

// Target precedence:
//   .env.local  -> the LOCAL Docker sandbox (http://127.0.0.1:54321). Mirrors
//                  Vite's own .env.local convention, so the dev server and the
//                  integration tests hit the same local stack.
//   .env.test   -> the remote TEST project.
//   process.env -> CI (the test project's URL/key arrive as env secrets).
const localEnv = parseEnvFile(path.resolve(process.cwd(), '.env.local'));
const testEnv = parseEnvFile(path.resolve(process.cwd(), '.env.test'));
const pick = (k: string) => localEnv[k] || testEnv[k] || process.env[k] || '';
const TEST_URL = pick('VITE_SUPABASE_URL');
const TEST_ANON = pick('VITE_SUPABASE_ANON_KEY');

if (!TEST_URL || !TEST_ANON) {
  throw new Error(
    'Integration tests need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY — in .env.local (local Docker stack, see docs/local-sandbox.md) or .env.test (remote test project, see .env.test.example), or as env vars in CI.'
  );
}

// Never let integration tests run against production — without hard-coding any
// project ref in source. (Logic + tests: src/test/integrationTargetGuard.ts)
assertSafeIntegrationTarget({
  targetUrl: TEST_URL,
  expectedRef: (process.env.EXPECTED_SUPABASE_PROJECT_REF ?? '').trim(),
  isCI: !!process.env.CI,
  prodUrl: parseEnvFile(path.resolve(process.cwd(), '.env')).VITE_SUPABASE_URL ?? '',
});

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
