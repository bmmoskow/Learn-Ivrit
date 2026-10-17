# Local Docker sandbox

Run the whole Supabase stack on your machine (Postgres, Auth, Studio, edge
runtime) in Docker, apply the repo's migrations to it, and run the integration
tests against that **local** database — completely offline from the remote test
and production projects.

This is "Model B": a disposable, prod-shaped sandbox that can never touch a
hosted project.

## Prerequisites

- **Docker** running (Docker Desktop, Colima, etc.)  Desktop Install: <https://www.docker.com/products/docker-desktop>
- The **Supabase CLI** (`supabase --version`). Install: <https://supabase.com/docs/guides/cli>.

## Spin it up

```bash
npm run sandbox:start     # boots the Docker stack (first run pulls images) AND writes .env.local
npm run sandbox:reset     # supabase db reset — drops, re-creates, and applies ALL migrations
```

`sandbox:start` runs `supabase start` and then fills `.env.local` for you, so
there is no separate setup step — just run it and go. The env-fill reads
`supabase status -o env` and writes `VITE_SUPABASE_URL` +
`VITE_SUPABASE_ANON_KEY` into `.env.local` (from `.env.local.example` the first
time; updating those two values in place and preserving your edits afterward).
It adds ~1s to startup. If you ever need to re-sync `.env.local` without a full
restart, run `npm run sandbox:env` on its own.

`sandbox:start` also **masks the stack's secret values** (Secret key, S3 keys) in
the printout — they're local shared defaults, but the raw output looks alarming.
The publishable key and all URLs stay visible. Run `npm run sandbox:status` for
the unmasked table if you need those values.

Why the env-fill exists: recent Supabase CLI (2.95+) gives each stack its own
asymmetric signing keys, so there is no universal demo anon key — the old HS256
demo JWT fails with `PGRST301` ("No suitable key or wrong key type"). The stack's
key is a deterministic shared default (stable across `stop`/`start` and
`db reset`), so the value in `.env.local` keeps working; it only changes after a
CLI upgrade or a JWT/`project_id` config change. `.env.local` is gitignored.

- `sandbox:start` prints the local URLs/keys (API `:54321`, DB `:54322`, Studio
  `:54323`, Inbucket email `:54324`).
- `sandbox:reset` rebuilds the DB from `supabase/migrations/*` — the same
  baseline + migrations that define production's schema. Re-run it anytime to
  get a clean, prod-shaped database.

Optional — load the app's config rows (pricing, cache retention, spend alerts)
so the app behaves normally when you run it locally (not needed for the
integration tests, which create their own data):

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed-config.sql
```

## Run the integration tests against local

With `.env.local` present, the integration config automatically targets the
local stack (it takes precedence over `.env.test`):

```bash
npm run test:integration
```

The prod-guard in `vitest.integration.config.ts` treats a `localhost` /
`127.0.0.1` URL as inherently safe, so these runs **cannot** reach a hosted
project. (To run against the remote **test** project instead, remove/rename
`.env.local` and use `.env.test` — see `.env.test.example`.)

## Run the app against local

`npm run dev` (Vite) reads `.env.local` too, so the dev server will talk to the
local stack with the same config.

## Tear down

```bash
npm run sandbox:stop      # supabase stop — stops the containers (data persists)
# or:  supabase stop --no-backup   # stop and discard the local database
```

## Notes & caveats

- **Postgres version:** `config.toml` pins `major_version = 15` to match prod.
- **`http` extension:** the baseline migration creates the `http` extension
  (`CREATE EXTENSION ... http`), used by the `notify_admin_alert` trigger.
  Supabase's local Postgres image is expected to include it; if a `db reset`
  fails on that line, your local image lacks `http` — update the CLI/image.
- **pg_cron:** the cron migration (`20260927141629`) is guarded to **skip**
  cleanly when `pg_cron` isn't available, so a local `db reset` won't hard-fail
  if the local image doesn't ship it.
- **Edge functions** run via `supabase functions serve`; they need their own
  runtime secrets (`GEMINI_API_KEY`, `RESEND_API_KEY`, …) set locally if you
  exercise them. The integration tests here hit the DB directly and don't
  require functions.
- **Safety:** nothing in this workflow points at or mutates a hosted project.
  The guard refuses prod, CI fails closed, and localhost is the only
  no-verification-needed target.
