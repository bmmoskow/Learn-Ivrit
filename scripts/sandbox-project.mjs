// Shared helper for the local Supabase sandbox scripts.
//
// The Supabase CLI decides a local stack's Docker name/labels from, in order of
// precedence: the SUPABASE_PROJECT_ID env var → supabase/.temp/linked-project.json
// → config.toml `project_id`. On a maintainer's machine the first two can point
// at a REMOTE project (e.g. a prod ref sitting in .env, or a leftover `supabase
// link`), which makes the purely-local sandbox come up named after prod
// (supabase_db_<prodref>, volumes labelled with the prod ref, etc.) — alarming
// and easy to misread.
//
// To keep the local sandbox self-contained we FORCE SUPABASE_PROJECT_ID to the
// `project_id` in config.toml before invoking the CLI. Since the env var wins
// over everything, the stack is deterministically named after config.toml
// regardless of any inherited env var or stale link. This only affects the
// sandbox child processes; it does not change your shell or remote CLI commands.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Force SUPABASE_PROJECT_ID to config.toml's project_id and return it. */
export function pinLocalProjectId() {
  const toml = readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8');
  const m = toml.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error('Could not find project_id in supabase/config.toml');
  process.env.SUPABASE_PROJECT_ID = m[1];
  return m[1];
}
