import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Auth fixture for the REAL-backend e2e suite. Produces playwright/.auth/user.json
// — a Playwright storageState holding a GENUINE signed-in Supabase session — and
// seeds that user's own vocabulary, so the authenticated e2e describes (which opt
// in via `test.use({ storageState })`) run as a real logged-in user against real
// RLS. A hand-forged JWT would not pass RLS, which is why those tests were fixme'd
// until this existed.
//
// This runs as the `setup` project, a dependency of the `e2e` project (see
// playwright.config.ts), so it executes once before the e2e tests. It needs the
// real backend (local Docker sandbox, or the CI ephemeral local stack); the
// mocked `ui` project does NOT depend on it.

// Playwright runs from the project root (where playwright.config.ts lives), so
// cwd is the repo root. Using it keeps this file ESM-safe (no __dirname).
const REPO_ROOT = process.cwd();
const AUTH_FILE = path.resolve(REPO_ROOT, 'playwright/.auth/user.json');

// Same password the integration-test helper uses. Not a secret — this user exists
// only in the disposable local sandbox / test project.
const PASSWORD = 'TestPassword123!';

// The fixture user's own vocabulary. Enough distinct words that the authed
// TestPanel has multiple-choice distractors and the Flashcard deck has cards.
// Columns mirror what VocabularyList writes (and the flashcard integration test
// seeds): user_id + hebrew_word + english_translation + definition + transliteration.
const SEED_WORDS = [
  { hebrew_word: 'סֵפֶר', english_translation: 'book', transliteration: 'sefer' },
  { hebrew_word: 'עֵץ', english_translation: 'tree', transliteration: 'etz' },
  { hebrew_word: 'מַיִם', english_translation: 'water', transliteration: 'mayim' },
  { hebrew_word: 'אֶרֶץ', english_translation: 'land', transliteration: 'eretz' },
  { hebrew_word: 'שֶׁמֶשׁ', english_translation: 'sun', transliteration: 'shemesh' },
  { hebrew_word: 'יֶלֶד', english_translation: 'child', transliteration: 'yeled' },
];

// Resolve the backend URL + anon key the same way playwright.config builds the
// app: prefer .env.local (written by `npm run sandbox:start`, and in CI by the
// ephemeral-stack job via `npm run sandbox:env`), then process.env. The e2e suite
// targets a REAL backend, so a real anon key is required — the build's
// 'local-anon-key' placeholder cannot authenticate.
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

function resolveBackend(): { url: string; anon: string } {
  const fromFile = parseEnvFile(path.resolve(REPO_ROOT, '.env.local'));
  const url = fromFile.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anon = fromFile.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !anon || anon === 'local-anon-key') {
    throw new Error(
      'Auth fixture needs a real backend: set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY ' +
        'in .env.local (run `npm run sandbox:start`) or the environment. The e2e suite ' +
        'targets a real backend; the build placeholder key cannot authenticate.',
    );
  }
  return { url, anon };
}

setup('authenticate and seed a fixture user', async () => {
  const { url, anon } = resolveBackend();

  // Capture EXACTLY what supabase-js persists, by giving the real library an
  // in-memory storage and letting it write the session itself. The storageState
  // key and token format are then byte-for-byte what the browser app writes — no
  // hand-rolled JWT, no guessing the `sb-<ref>-auth-token` key or its encoding.
  const store = new Map<string, string>();
  const memoryStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  const sb = createClient(url, anon, {
    auth: {
      storage: memoryStorage,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const email = `e2e-auth-${crypto.randomUUID()}@example.com`;

  // enable_confirmations is off in the sandbox config, so signUp creates a
  // confirmed user; signInWithPassword then guarantees a live session regardless.
  const { error: signUpError } = await sb.auth.signUp({ email, password: PASSWORD });
  if (signUpError) throw new Error(`auth fixture signUp failed: ${signUpError.message}`);

  const { data, error: signInError } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (signInError || !data.user || !data.session) {
    throw new Error(`auth fixture signIn failed: ${signInError?.message ?? 'no session returned'}`);
  }

  // Seed the user's own vocabulary (RLS lets a user insert their own rows).
  const { error: seedError } = await sb
    .from('vocabulary_words')
    .insert(SEED_WORDS.map((w) => ({ user_id: data.user!.id, ...w, definition: w.english_translation })));
  if (seedError) throw new Error(`auth fixture vocabulary seed failed: ${seedError.message}`);

  // supabase-js has now persisted the session into `store` under its own key(s).
  const localStorageEntries = [...store.entries()].map(([name, value]) => ({ name, value }));
  if (localStorageEntries.length === 0) {
    throw new Error('auth fixture: supabase-js persisted no session to storage');
  }

  // storageState applies this localStorage to the app's own origin (baseURL). The
  // app reads the session key on load and comes up authenticated.
  const storageState = {
    cookies: [],
    origins: [{ origin: 'http://localhost:4173', localStorage: localStorageEntries }],
  };

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
});
