#!/usr/bin/env node
// Local runner for the UI sign-up round-trip (npm run test:signup-roundtrip-ui).
//
// The Playwright `roundtrip` project needs the local stack running with email
// confirmations ON (so sign-up emails a real 6-digit code it can read back from
// the local mailbox). The committed supabase/config.toml keeps confirmations OFF
// so normal dev and the other suites auto-confirm. This wrapper flips the flag ON
// just for this run and ALWAYS restores it:
//
//   snapshot config.toml -> patch confirmations ON -> restart stack
//     -> run ONLY the roundtrip project -> (finally) restore snapshot -> restart
//
// Same approach as scripts/signup-roundtrip.mjs (the vitest round-trip); this one
// drives the browser instead. Your DB data survives the restarts (stop backs up +
// start restores). Needs Playwright's chromium installed
// (`npx playwright install --with-deps chromium`).

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './sandbox-project.mjs';

const configPath = path.join(root, 'supabase', 'config.toml');

function run(cmd, args, { tolerateFailure = false } = {}) {
  const label = `${cmd} ${args.join(' ')}`;
  console.log(`\n▶ ${label}`);
  const res = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true });
  if (res.status !== 0 && !tolerateFailure) {
    throw new Error(`\`${label}\` exited with code ${res.status}`);
  }
  return res.status ?? 0;
}

function restartStack() {
  run('node', ['scripts/supabase-local.mjs', 'stop'], { tolerateFailure: true });
  // sandbox-start boots the stack AND writes .env.local (incl. the service-role
  // key the spec reads for its step-10 deletion checks).
  run('node', ['scripts/sandbox-start.mjs']);
}

const original = readFileSync(configPath, 'utf8');

if (!/^enable_confirmations\s*=/m.test(original)) {
  console.error('✖ Could not find `enable_confirmations` in supabase/config.toml — aborting.');
  process.exit(1);
}

const patched = original.replace(/^enable_confirmations\s*=\s*false/m, 'enable_confirmations = true');

let exitCode = 0;
try {
  console.log('• Enabling email confirmations for this run (config.toml patched in place)…');
  writeFileSync(configPath, patched);
  restartStack();

  console.log('\n• Running the UI sign-up round-trip (Playwright roundtrip project)…');
  exitCode = run('npx', ['playwright', 'test', '--project=roundtrip'], { tolerateFailure: true });
} finally {
  console.log('\n• Restoring original config.toml and restarting the stack…');
  writeFileSync(configPath, original);
  try {
    restartStack();
  } catch (err) {
    console.error(
      '✖ Failed to restart the stack after restoring config.toml. Config is restored; ' +
        'run `npm run sandbox:start` manually.',
      err,
    );
  }
}

// Final status LAST, so the stack-restart tables above don't bury the result.
// Without this the run ends on a green "Started supabase…" table and a failing
// test looks like it passed.
console.log('\n────────────────────────────────────────────────────────');
if (exitCode === 0) {
  console.log('✅ UI sign-up round-trip PASSED');
} else {
  console.error(`❌ UI sign-up round-trip FAILED (exit ${exitCode}).`);
  console.error('   Scroll up to the Playwright "✘"/Error output for the failing step + selector.');
}
console.log('────────────────────────────────────────────────────────');

process.exit(exitCode);
