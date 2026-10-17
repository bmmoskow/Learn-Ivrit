#!/usr/bin/env node
// Wrapper for `supabase start` used by `npm run sandbox:start`.
//
// `supabase start` prints a table that includes the stack's Secret key, S3 keys,
// etc. Those are LOCAL shared-default dev values (they only unlock the stack on
// 127.0.0.1, and the CLI calls them "shared defaults — do not use in
// production"), but the raw printout looks alarming. This wrapper masks those
// secret values so the output is calm; the publishable key and all URLs stay
// visible. Need the real values? `npm run sandbox:status` shows them unmasked.
//
// Design: the key table prints on STDOUT; boot/pull progress prints on STDERR.
// So we inherit stderr untouched (live progress, spinners intact) and only
// transform stdout. After a successful start we fill .env.local.

import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Secret-looking values to mask. Each match becomes an equal-length run of '•'
// so the CLI's boxed table stays aligned. The publishable key (sb_publishable_)
// is intentionally NOT matched — it's the anon-equivalent, not a secret.
const SECRET_PATTERNS = [
  /sb_secret_[A-Za-z0-9_-]+/g, // Secret key
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // legacy service_role / anon JWTs
  /\b[0-9a-f]{32,}\b/g, // S3 access key (32 hex) / secret key (64 hex)
];
function redactLine(line) {
  let out = line;
  for (const re of SECRET_PATTERNS) out = out.replace(re, (m) => '•'.repeat(m.length));
  return out;
}

// Line-buffer stdout, redact each complete line, forward to our stdout.
let buf = '';
function onStdout(chunk) {
  buf += chunk.toString();
  let nl;
  while ((nl = buf.indexOf('\n')) !== -1) {
    process.stdout.write(redactLine(buf.slice(0, nl)) + '\n');
    buf = buf.slice(nl + 1);
  }
}
function flushStdout() {
  if (buf) {
    process.stdout.write(redactLine(buf));
    buf = '';
  }
}

const child = spawn('supabase', ['start'], { cwd: root, shell: true, stdio: ['inherit', 'pipe', 'inherit'] });
child.stdout.on('data', onStdout);
child.stdout.on('end', flushStdout);

child.on('close', (code) => {
  flushStdout();
  if (code !== 0) process.exit(code);
  // Fill .env.local (this step prints only the publishable key).
  try {
    execSync('node scripts/setup-sandbox-env.mjs', { cwd: root, stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
  console.log(
    '\nℹ Secret values above are hidden — they are local dev defaults (stack on 127.0.0.1 only).\n' +
      '  Run `npm run sandbox:status` if you need the unmasked table.',
  );
});

child.on('error', (err) => {
  console.error('Failed to run `supabase start`:', err.message);
  process.exit(1);
});
