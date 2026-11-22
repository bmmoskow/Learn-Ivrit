// Shared backend resolution for the real-backend e2e fixture (auth.setup.ts)
// and its teardown (auth.teardown.ts). Keeping it in one place means setup and
// teardown always agree on WHICH backend they target and HOW they authenticate —
// so the run can never create a user against one project and try to delete it
// against another.
//
// Resolution order matches playwright.config's build: prefer .env.local (written
// locally by `npm run sandbox:start` for the Docker stack, or `npm run
// sandbox:test-env` to point at the hosted TEST project), then process.env (how
// CI supplies the pipeline environment's secrets).
import fs from 'fs';
import path from 'path';

// Playwright runs from the repo root (where playwright.config.ts lives), so cwd
// is the project root. Using it keeps these files ESM-safe (no __dirname).
export const REPO_ROOT = process.cwd();
const AUTH_DIR = path.resolve(REPO_ROOT, 'playwright/.auth');

// The Playwright storageState — a genuine signed-in Supabase session.
export const AUTH_FILE = path.join(AUTH_DIR, 'user.json');

// Records the fixture user so the teardown project can delete it (and, via
// ON DELETE CASCADE on user_id -> auth.users, everything it created) after the
// e2e run. Lives alongside user.json under the gitignored playwright/.auth dir.
export const FIXTURE_FILE = path.join(AUTH_DIR, 'fixture.json');

export type FixtureRecord = { userId: string; email: string };

function parseEnvFile(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
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
    /* no .env.local — fall through to process.env */
  }
  return out;
}

function localEnv(): Record<string, string> {
  return parseEnvFile(path.resolve(REPO_ROOT, '.env.local'));
}

/**
 * The backend URL + anon key the app and fixture authenticate against. The e2e
 * suite targets a REAL backend, so a real anon key is required — the build's
 * 'local-anon-key' placeholder cannot authenticate.
 */
export function resolveBackend(): { url: string; anon: string } {
  const fromFile = localEnv();
  const url = fromFile.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anon = fromFile.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !anon || anon === 'local-anon-key') {
    throw new Error(
      'e2e auth fixture needs a real backend: set VITE_SUPABASE_URL + ' +
        'VITE_SUPABASE_ANON_KEY in .env.local (`npm run sandbox:start` for the local ' +
        'Docker stack, or `npm run sandbox:test-env` for the hosted TEST project) or ' +
        'in the environment. The build placeholder key cannot authenticate.',
    );
  }
  return { url, anon };
}

/**
 * The service-role key the TEARDOWN uses to delete the fixture user via the admin
 * API. Required: we refuse to create a fixture user we cannot later delete, so
 * both setup and teardown assert this up front. In CI it comes from the pipeline
 * environment's SUPABASE_SERVICE_ROLE_KEY secret; locally from .env.local.
 */
export function resolveServiceRoleKey(): string {
  const fromFile = localEnv();
  const key = fromFile.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) {
    throw new Error(
      'e2e auth fixture needs SUPABASE_SERVICE_ROLE_KEY so the fixture user can be ' +
        'deleted after the run (auth.admin.deleteUser cascades away all its data). ' +
        'Set it in .env.local (local) or the pipeline environment (CI). Refusing to ' +
        'create a user that cannot be cleaned up.',
    );
  }
  return key;
}
