import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import fs from 'fs';
import path from 'path';
import { assertSafeIntegrationTarget } from './src/test/integrationTargetGuard';

// Config for the SIGN-UP ROUND-TRIP suite (*.roundtriptest.ts) — its own test
// TYPE, deliberately separate from both *.unittest (mocked) and *.integrationtest
// (real-backend, may be the remote TEST project in CI). This suite exercises the
// genuine emailed-OTP path, so it:
//
//   • ALWAYS targets a LOCAL stack (never CI's remote TEST project) — reading the
//     emailed code requires the local mailbox (Inbucket/Mailpit), which a hosted
//     project can't provide. We parse .env.local directly in every environment
//     (local dev AND the CI ephemeral-stack job both write it via `sandbox:env`).
//   • needs the stack running with enable_confirmations = true (the committed
//     config keeps it false; it's flipped on only for the throwaway stack — see
//     the CI job and scripts/signup-roundtrip.mjs).
//
// Same direct-parse approach as vitest.integration.config.ts: Vite's loadEnv
// would give a PROD VITE_SUPABASE_URL in process.env precedence over the file, so
// we read the file ourselves and inject via `define` to pin the local target.
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

const localEnv = parseEnvFile(path.resolve(process.cwd(), '.env.local'));
const TEST_URL = localEnv.VITE_SUPABASE_URL ?? '';
const TEST_ANON = localEnv.VITE_SUPABASE_ANON_KEY ?? '';
// Required for this suite: step 10 verifies (as service-role) that the deleted
// user and all its rows are really gone — impossible with the anon key once the
// account is deleted. `npm run sandbox:env` writes it from the local stack.
const TEST_SERVICE_ROLE = localEnv.SUPABASE_SERVICE_ROLE_KEY ?? '';
// Optional mail-catcher override; defaults to http://127.0.0.1:54324 in the helper.
const MAIL_URL = localEnv.INBUCKET_URL || localEnv.MAILPIT_URL || '';

if (!TEST_URL || !TEST_ANON) {
  throw new Error(
    'The sign-up round-trip suite needs the local sandbox. Run `npm run sandbox:start` ' +
      '(or `npm run test:signup-roundtrip`, which boots it with confirmations on).',
  );
}

// This suite is LOCAL-ONLY by design: assert the target is a localhost stack.
// (isCI:false → the guard accepts only localhost / 127.0.0.1, never a remote.)
assertSafeIntegrationTarget({ targetUrl: TEST_URL, expectedRef: '', isCI: false });

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
    include: ['src/**/*.roundtriptest.{ts,tsx}'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    env: {
      VITE_SUPABASE_URL: TEST_URL,
      VITE_SUPABASE_ANON_KEY: TEST_ANON,
      ...(TEST_SERVICE_ROLE ? { SUPABASE_SERVICE_ROLE_KEY: TEST_SERVICE_ROLE } : {}),
      ...(MAIL_URL ? { INBUCKET_URL: MAIL_URL } : {}),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
