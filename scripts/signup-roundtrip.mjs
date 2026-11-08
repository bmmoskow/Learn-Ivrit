#!/usr/bin/env node
// Local runner for the sign-up round-trip suite (npm run test:signup-roundtrip).
//
// That suite needs the local stack running with email confirmations ON, but the
// committed supabase/config.toml keeps them OFF on purpose (local dev and the
// other test suites rely on auto-confirm). So this wrapper flips the flag ON just
// for this run and ALWAYS restores it afterwards:
//
//   snapshot config.toml bytes → patch confirmations ON → restart stack
//     → run ONLY this suite → (finally) restore the snapshot → restart stack
//
// The snapshot is the exact original bytes, so any unrelated local edits to
// config.toml survive untouched. The restore runs even if the suite fails. The
// only unrecoverable case is the process being hard-killed mid-run, which would
// leave config.toml showing as modified in `git status` (visible, not silent)
// and the next normal run failing loudly — restore with `git checkout` then.
//
// NOTE: this restarts your local Supabase stack twice (~1-2 min). Your database
// data is preserved across the restarts (supabase stop/start backs up + restores).
// In CI the suite is run WITHOUT this wrapper — the CI job starts its own
// throwaway stack already configured with confirmations on.

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
  // Stop is tolerant: the stack may not be running yet.
  run('node', ['scripts/supabase-local.mjs', 'stop'], { tolerateFailure: true });
  // sandbox-start boots the stack AND writes .env.local (incl. the service-role
  // key the suite needs for its post-deletion checks).
  run('node', ['scripts/sandbox-start.mjs']);
}

const original = readFileSync(configPath, 'utf8');

if (!/^enable_confirmations\s*=/m.test(original)) {
  console.error(
    '✖ Could not find `enable_confirmations` in supabase/config.toml — aborting without changes.',
  );
  process.exit(1);
}

const patched = original.replace(
  /^enable_confirmations\s*=\s*false/m,
  'enable_confirmations = true',
);

let exitCode = 0;
try {
  console.log('• Enabling email confirmations for this run (config.toml patched in place)…');
  writeFileSync(configPath, patched);
  restartStack();

  console.log('\n• Running the sign-up round-trip suite…');
  exitCode = run('npx', ['vitest', 'run', '--config', 'vitest.roundtrip.config.ts'], {
    tolerateFailure: true,
  });
} finally {
  console.log('\n• Restoring original config.toml and restarting the stack…');
  writeFileSync(configPath, original);
  try {
    restartStack();
  } catch (err) {
    console.error(
      '✖ Failed to restart the stack after restoring config.toml. Your config is ' +
        'restored; run `npm run sandbox:start` manually.',
      err,
    );
  }
}

// Final status LAST, so the stack-restart tables above don't bury the result.
// Without this the run ends on a green "Started supabase…" table and a failing
// test looks like it passed.
console.log('\n────────────────────────────────────────────────────────');
if (exitCode === 0) {
  console.log('✅ Sign-up round-trip PASSED');
} else {
  console.error(`❌ Sign-up round-trip FAILED (exit ${exitCode}).`);
  console.error('   Scroll up to the vitest failure output above for the failing step.');
}
console.log('────────────────────────────────────────────────────────');

process.exit(exitCode);
