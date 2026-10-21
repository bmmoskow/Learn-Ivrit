#!/usr/bin/env node
// Runs a `supabase` subcommand against the LOCAL sandbox, pinned to the project
// id in config.toml (see sandbox-project.mjs). Used by npm run sandbox:stop /
// sandbox:status / sandbox:reset so they always act on the same stack that
// sandbox:start creates — never a prod ref inherited from .env or a stale link.
//
// Usage: node scripts/supabase-local.mjs <supabase args...>   e.g. `stop`, `status`, `db reset`

import { spawn } from 'node:child_process';
import { pinLocalProjectId, root } from './sandbox-project.mjs';

pinLocalProjectId();
const args = process.argv.slice(2);
const child = spawn('supabase', args, { cwd: root, stdio: 'inherit', shell: true });
child.on('close', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error(`Failed to run \`supabase ${args.join(' ')}\`:`, err.message);
  process.exit(1);
});
