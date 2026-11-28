// Starts the ephemeral local Supabase stack for CI, choosing FRESH free host
// ports on each attempt, to dodge the transient
//   "failed to bind host port 0.0.0.0:54322/tcp: address already in use"
// flake. `supabase start` is a ~10-container bring-up; when it fails partway and
// rolls back, the host-port binding (the docker-proxy) isn't always released
// before the next attempt re-binds the SAME configured port, so a plain retry on
// the fixed ports can lose all its attempts to one stuck port. Picking a new free
// port per attempt sidesteps that entirely — it doesn't depend on the previous
// bind being released. (The intra-`supabase start` self-race on a single attempt
// can't be prevented from out here; the retry with new ports is the mitigation.)
//
// We randomize api, db, db.shadow_port and studio. We deliberately LEAVE
// [local_smtp] on its fixed 54324, because the mail readers
// (src/test/inbucket.ts and tests/roundtrip/mailbox.ts) default to
// http://127.0.0.1:54324. The API URL and keys reach the tests dynamically via
// `supabase status -o env` (npm run sandbox:env), and the integration prod-guard
// keys on the hostname (127.0.0.1), not the port — so a random api port is safe.
//
// CI-only. Invoked from .github/workflows/integration.yml in place of the inline
// retry wrapper.

import net from "node:net";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const CONFIG_PATH = "supabase/config.toml";
const RESERVED = new Set([54324]); // [local_smtp] stays fixed; never reuse it.
const ATTEMPTS = 3;

/** Grab `count` distinct free TCP ports by holding them all open at once. */
export async function getFreePorts(count) {
  for (let tries = 0; tries < 10; tries++) {
    const servers = [];
    try {
      const ports = [];
      for (let i = 0; i < count; i++) {
        const port = await new Promise((resolve, reject) => {
          const s = net.createServer();
          s.on("error", reject);
          s.listen(0, "127.0.0.1", () => {
            servers.push(s);
            resolve(s.address().port);
          });
        });
        ports.push(port);
      }
      if (ports.some((p) => RESERVED.has(p))) continue; // re-roll if we hit a reserved port
      return ports;
    } finally {
      await Promise.all(servers.map((s) => new Promise((r) => s.close(r))));
    }
  }
  throw new Error("Could not find free ports after several tries.");
}

/**
 * Rewrite the chosen `port = N` / `shadow_port = N` lines, section-aware, leaving
 * every other line (including [local_smtp] port and enable_confirmations) intact.
 * Throws if any expected line is missing, so a config change can't silently skip a
 * port and reintroduce the fixed-port collision.
 */
export function rewriteConfigPorts(text, { api, db, shadow, studio }) {
  const targets = {
    "api.port": api,
    "db.port": db,
    "db.shadow_port": shadow,
    "studio.port": studio,
  };
  const seen = new Set();
  let section = null;
  // Split on either line ending and rejoin with the file's own, so a CRLF
  // config.toml (Windows checkout) keeps its endings and the tail regex below
  // isn't defeated by a trailing \r (JS `.` doesn't match \r).
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const out = text
    .split(/\r?\n/)
    .map((line) => {
      const sectionMatch = line.match(/^\s*\[([^\]]+)\]\s*$/);
      if (sectionMatch) {
        section = sectionMatch[1];
        return line;
      }
      const portMatch = line.match(/^(\s*)(port|shadow_port)\s*=\s*\d+(.*)$/);
      if (portMatch) {
        const key = `${section}.${portMatch[2]}`;
        if (key in targets) {
          seen.add(key);
          return `${portMatch[1]}${portMatch[2]} = ${targets[key]}${portMatch[3]}`;
        }
      }
      return line;
    })
    .join(newline);

  const missing = Object.keys(targets).filter((k) => !seen.has(k));
  if (missing.length) {
    throw new Error(`config.toml is missing expected port lines: ${missing.join(", ")}`);
  }
  return out;
}

function cleanup() {
  try {
    execSync("supabase stop --no-backup", { stdio: "inherit" });
  } catch {
    // no stack to stop on the first attempt — fine
  }
  // Remove any leftover supabase containers whose published host port might linger.
  try {
    const ids = execSync('docker ps -aq --filter "name=supabase_"', { encoding: "utf8" }).trim();
    if (ids) execSync(`docker rm -f ${ids.split("\n").join(" ")}`, { stdio: "inherit" });
  } catch {
    // nothing to remove — fine
  }
}

async function main() {
  // Read once, AFTER any earlier step (e.g. the confirmations sed) has edited the
  // file, so each attempt re-applies fresh ports on top of that same base.
  const base = readFileSync(CONFIG_PATH, "utf8");

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const [api, db, shadow, studio] = await getFreePorts(4);
    writeFileSync(CONFIG_PATH, rewriteConfigPorts(base, { api, db, shadow, studio }));
    console.log(
      `Attempt ${attempt}: api=${api} db=${db} shadow=${shadow} studio=${studio} (smtp fixed 54324)`,
    );

    cleanup();
    const res = spawnSync("supabase", ["start"], { stdio: "inherit" });
    if (res.status === 0) {
      console.log(`Supabase stack started (attempt ${attempt}).`);
      process.exit(0);
    }

    console.log(
      `::warning::supabase start failed on attempt ${attempt}; cleaning up and retrying with new ports.`,
    );
    cleanup();
    await new Promise((r) => setTimeout(r, 5000));
  }

  console.error("::error::supabase start failed after 3 attempts.");
  process.exit(1);
}

// Run only when executed directly, so tests/dry-runs can import the helpers.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
