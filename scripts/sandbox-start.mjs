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
// Design: we pipe BOTH stdout and stderr through the same redactor. The CLI
// prints status variables (incl. the Secret and S3 keys) on stdout, but when it
// detects an interactive terminal it ALSO prints a human-readable key table on
// stderr — so inheriting stderr untouched would leak those secrets. Piping both
// (a) scrubs every stream and (b) makes the CLI treat the run as non-interactive,
// so it emits its machine format instead of the pretty table. We flush on \n AND
// \r so boot/pull progress still renders. After a successful start we fill .env.local.

import { spawn, execSync } from 'node:child_process';
import { pinLocalProjectId, root } from './sandbox-project.mjs';
import { redactLine } from './redact-secrets.mjs';

// Name the local stack after config.toml, ignoring any inherited prod ref in
// SUPABASE_PROJECT_ID / a stale supabase link. See sandbox-project.mjs.
const projectId = pinLocalProjectId();

// Redact a stream segment-by-segment, forwarding to `sink`. We flush on BOTH
// \n and \r so in-place progress updates still render, while every completed
// segment is scrubbed of secret-looking values before it is written out.
function makeRedactor(sink) {
  let buf = '';
  return {
    onData(chunk) {
      buf += chunk.toString();
      let i;
      while ((i = buf.search(/[\r\n]/)) !== -1) {
        sink.write(redactLine(buf.slice(0, i)) + buf[i]);
        buf = buf.slice(i + 1);
      }
    },
    flush() {
      if (buf) {
        sink.write(redactLine(buf));
        buf = '';
      }
    },
  };
}

const outR = makeRedactor(process.stdout);
const errR = makeRedactor(process.stderr);

// Pipe BOTH streams (see header note): guarantees masking and forces the CLI's
// non-interactive output instead of the TTY key table.
const child = spawn('supabase', ['start'], { cwd: root, shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
child.stdout.on('data', outR.onData);
child.stdout.on('end', outR.flush);
child.stderr.on('data', errR.onData);
child.stderr.on('end', errR.flush);

child.on('close', (code) => {
  outR.flush();
  errR.flush();
  if (code !== 0) process.exit(code);
  // Fill .env.local (this step prints only the publishable key).
  try {
    execSync('node scripts/setup-sandbox-env.mjs', { cwd: root, stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
  console.log(
    `\nℹ Local stack: "${projectId}" (from supabase/config.toml).\n` +
      '  Secret values above are hidden — they are local dev defaults (stack on 127.0.0.1 only).\n' +
      '  Run `npm run sandbox:status` if you need the unmasked table.',
  );
});

child.on('error', (err) => {
  console.error('Failed to run `supabase start`:', err.message);
  process.exit(1);
});
