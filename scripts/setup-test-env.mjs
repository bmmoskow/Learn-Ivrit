#!/usr/bin/env node
// Points .env.local at the hosted TEST Supabase project, so a LOCAL e2e run
// (`npm run test:e2e`) hits the exact same backend the CI pipeline does — giving
// true sandbox/pipeline parity ("if it works locally, it works in the pipeline").
// This is the alternative to `npm run sandbox:env`, which fills .env.local from
// the local Docker stack instead.
//
// Credentials come from the hosted test project (they're the same values stored
// in the `pipeline` GitHub environment). Provide them either as a gitignored
// `.env.test` file at the repo root or as environment variables:
//
//   TEST_SUPABASE_URL=...                 (the test project's API URL)
//   TEST_SUPABASE_ANON_KEY=...            (its anon / publishable key)
//   TEST_SUPABASE_SERVICE_ROLE_KEY=...    (needed so the e2e teardown can delete
//                                          the fixture user after the run)
//
// Usage: npm run sandbox:test-env
//
// NOTE: this points local runs at a SHARED real project. The e2e suite creates a
// fresh random fixture user per run and its teardown deletes it afterwards, so it
// cleans up after itself — but be aware other people's runs share the project.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Parse a KEY=VALUE env file into a plain object (quotes trimmed). */
function parseEnvFile(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
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
  return out;
}

// Source: a gitignored .env.test file first, then the process environment.
const fromFile = parseEnvFile(path.join(root, '.env.test'));
const pick = (name) => fromFile[name] || process.env[name] || '';

const url = pick('TEST_SUPABASE_URL');
const anon = pick('TEST_SUPABASE_ANON_KEY');
const serviceRole = pick('TEST_SUPABASE_SERVICE_ROLE_KEY');

const missing = [
  ['TEST_SUPABASE_URL', url],
  ['TEST_SUPABASE_ANON_KEY', anon],
  ['TEST_SUPABASE_SERVICE_ROLE_KEY', serviceRole],
]
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(
    `✖ Missing ${missing.join(', ')}.\n` +
      '  Provide the hosted TEST project creds via a gitignored .env.test file at\n' +
      '  the repo root, or as environment variables. See the header of\n' +
      '  scripts/setup-test-env.mjs for the expected names.',
  );
  process.exit(1);
}

// Write .env.local with exactly the keys the app build + the e2e fixture read.
// VITE_* feed the served app; SUPABASE_SERVICE_ROLE_KEY feeds the teardown.
const body =
  '# Written by `npm run sandbox:test-env` — points local runs at the hosted TEST\n' +
  '# project for sandbox/pipeline parity. Re-run to refresh; `npm run sandbox:env`\n' +
  '# overwrites this to point back at the local Docker stack.\n' +
  `VITE_SUPABASE_URL=${url}\n` +
  `VITE_SUPABASE_ANON_KEY=${anon}\n` +
  `SUPABASE_SERVICE_ROLE_KEY=${serviceRole}\n`;

writeFileSync(path.join(root, '.env.local'), body);

console.log(
  '✓ .env.local now points at the hosted TEST project.\n' +
    `  URL: ${url}\n` +
    '  Run `npm run test:e2e` to exercise the same backend CI uses.\n' +
    '  (`npm run sandbox:env` switches back to the local Docker stack.)',
);
