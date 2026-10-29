#!/usr/bin/env node
// Fills .env.local for the local Supabase sandbox by reading the running
// stack's real values from `supabase status`. This removes the manual
// copy-the-key step: the stack issues its own publishable key, and this script
// copies it (plus the API URL) into .env.local, using .env.local.example as the
// template. Safe to re-run — it updates the two values in place and preserves
// anything else you added. See docs/local-sandbox.md.
//
// Usage: npm run sandbox:env   (the stack must be running: npm run sandbox:start)

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pinLocalProjectId, root } from './sandbox-project.mjs';

// Read status from the LOCAL stack named by config.toml, not a prod ref that
// may be sitting in SUPABASE_PROJECT_ID / a stale link. See sandbox-project.mjs.
pinLocalProjectId();

const envPath = path.join(root, '.env.local');
const examplePath = path.join(root, '.env.local.example');

// 1. Read the running stack's values in machine-readable form.
let raw;
try {
  raw = execSync('supabase status -o env', { cwd: root, encoding: 'utf8' });
} catch (err) {
  console.error(
    '✖ Could not read `supabase status`. Is the local stack running?\n' +
      '  Start it with:  npm run sandbox:start',
  );
  process.exit(1);
}

const vals = {};
for (const line of raw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m) vals[m[1]] = m[2];
}

const apiUrl = vals.API_URL;
// Prefer the new publishable key; fall back to the legacy anon JWT on older CLIs.
const anonKey = vals.PUBLISHABLE_KEY || vals.ANON_KEY;
const keyKind = vals.PUBLISHABLE_KEY ? 'publishable' : 'anon';
// Service-role key (local stack only). Lets the integration test-user helper
// fully delete test auth users during cleanup; optional, so we don't fail
// without it. This is the LOCAL sandbox's key — not a real secret.
const serviceRoleKey = vals.SERVICE_ROLE_KEY;

if (!apiUrl || !anonKey) {
  console.error('✖ `supabase status -o env` did not include API_URL / PUBLISHABLE_KEY.');
  process.exit(1);
}

// 2. Base on the existing .env.local (preserve customizations) or the template.
const base = existsSync(envPath) ? envPath : examplePath;
let content = readFileSync(base, 'utf8');

// 3. Set the two values in place (append if the var is absent).
function setVar(text, name, value) {
  const re = new RegExp(`^(${name}=).*$`, 'm');
  const line = `${name}="${value}"`;
  return re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
}
content = setVar(content, 'VITE_SUPABASE_URL', apiUrl);
content = setVar(content, 'VITE_SUPABASE_ANON_KEY', anonKey);
if (serviceRoleKey) {
  content = setVar(content, 'SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey);
}

// 4. Write.
writeFileSync(envPath, content);
console.log(`✔ ${base === envPath ? 'Updated' : 'Created'} .env.local from ${path.basename(base)}`);
console.log(`    VITE_SUPABASE_URL=${apiUrl}`);
console.log(`    VITE_SUPABASE_ANON_KEY=${anonKey.slice(0, 18)}… (${keyKind} key)`);
if (serviceRoleKey) {
  console.log(`    SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey.slice(0, 18)}… (local service-role key)`);
}
