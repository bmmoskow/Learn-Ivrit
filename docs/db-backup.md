# Database backups (Cloudflare R2)

The `.github/workflows/db-backup.yml` workflow takes a scheduled logical backup
of the **production** Postgres database and stores it in a private **Cloudflare
R2** bucket. It runs daily (08:00 UTC) and can be triggered manually.

Why this exists: the prod Supabase project is on the **Free plan, which has no
built-in backups**. Without this, a bad migration, accidental delete, or Supabase
incident means user data (vocabulary, test history, bookmarks) is unrecoverable.

The workflow **safely no-ops** until the secrets below are set, so merging it
early causes no failing runs.

## One-time setup

### 1. Create the R2 bucket
- Cloudflare dashboard → **R2** → **Create bucket**.
- Name it e.g. `learn-ivrit-backups`, **Location: North America (US)** — this
  keeps backups consistent with the Privacy Policy's "United States" statement.
- Keep it **private** (default). The dumps contain user PII.
- (Recommended) Add an **Object lifecycle rule** to expire objects under the
  `db/` prefix after ~30 days, so backups self-prune. (R2 → bucket → Settings →
  Object lifecycle rules.)

### 2. Create an R2 API token
- R2 → **Manage R2 API Tokens** → **Create API token**.
- Permission: **Object Read & Write**, scoped to the backup bucket.
- Copy the **Access Key ID**, **Secret Access Key**, and note your **Account ID**
  (shown on the R2 overview page).

### 3. Get the database connection string — IMPORTANT
Supabase dashboard → **Project Settings → Database → Connection string**.
Use the **Session pooler** string (Supavisor), which looks like:

    postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

- **Must be the Session pooler (port 5432).** `pg_dump` needs a session
  connection. The **direct** URL (`db.<ref>.supabase.co`) is IPv6-only and won't
  work from GitHub runners; the **transaction pooler** (port `6543`) doesn't
  support `pg_dump`.
- Substitute your real DB password into the string.

### 4. Add config to the `deployment` environment
The workflow job runs in the **`deployment`** GitHub Environment (Repo →
**Settings → Environments → `deployment`**). Scoping to this environment keeps the
DB credential out of general CI/pipeline jobs; its branch policy allows only `main`.

Add the three sensitive values as **Environment secrets**:

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | the Session-pooler connection string from step 3 |
| `R2_ACCESS_KEY_ID` | R2 token access key id |
| `R2_SECRET_ACCESS_KEY` | R2 token secret |

Add the account id and bucket name as **Environment variables** (NOT secrets —
neither is sensitive, and keeping them un-masked lets the full S3 target show in
the run logs, which makes a wrong-account/wrong-bucket mistake obvious):

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | Cloudflare account ID (e.g. `187154f71950c20ada20f1987affbb74`) |
| `R2_BUCKET` | bucket name (e.g. `learn-ivrit-db-backup-main`) |

### 5. Test it
Once the workflow is on `main`: Actions → **DB Backup** → **Run workflow**, and
select the **`main`** branch (the `deployment` environment only permits `main`,
so a run from any other branch is blocked). Confirm it uploads an object to
`db/YYYY/MM/...sql.gz` in the bucket. After that, the daily schedule runs on its own.

## What's in the backup (and what isn't)
- **Included:** the `public` schema — all application data (profiles, vocabulary,
  word statistics, tests, bookmarks, caches, config).
- **Not included:** Supabase-managed schemas, notably `auth` (login accounts).
  Restoring accounts is handled by Supabase's own tooling. To widen the dump, add
  more `--schema=` flags (e.g. `--schema=auth`) in the workflow — but restoring
  managed schemas is more involved, so start with `public`.

## Restore

The dump is a **full logical dump of the `public` schema** — it contains the DDL
(CREATE TABLE, indexes, constraints, functions, triggers, views) **and** the data
(COPY/INSERT). Restoring it rebuilds the structure and loads the rows in one step,
so it is self-contained for the `public` schema.

### Steps
1. Download the backup you want to restore:

       aws s3 cp s3://learn-ivrit-db-backup-main/db/2026/08/<file>.sql.gz ./ \
         --endpoint-url https://<account-id>.r2.cloudflarestorage.com --profile r2

2. Restore into an **empty** target `public` schema via the Session-pooler URL:

       gunzip -c <file>.sql.gz | psql "postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"

3. Verify: spot-check table row counts and that RLS policies exist.

### Gotchas (important)
- **Restore into an EMPTY `public` schema — do NOT pre-apply a schema first.** The
  dump already contains `CREATE TABLE`, so if the target already has the tables
  (e.g. you applied a baseline), you get "already exists" conflicts. Fresh/empty
  `public` schema → restore → done.
- **The dump does NOT include the `auth` schema (login accounts).** It is scoped to
  `--schema=public`. App tables have foreign keys to `auth.users`
  (e.g. `vocabulary_words.user_id → auth.users.id`), so restoring the public
  **data** into a fresh project hits **FK violations** — the referenced users
  don't exist there. For a real recovery / restore test, choose one:
    - Restore **schema only** (skip the data) to confirm the DDL applies cleanly — quick, no FK issue.
    - For a **full** restore, handle the auth linkage first: recreate the matching
      `auth.users` rows, OR temporarily drop the `auth.users` foreign keys, load
      the data, then decide whether to re-add them.
- **A backup is only truly validated once you've restored it.** Do a practice
  restore into the test environment before you ever need it for real.

## Notes
- `SUPABASE_DB_URL` grants full read access to the database — treat it as
  sensitive; rotate the DB password if it's ever exposed.
- Retention is handled by the R2 lifecycle rule (step 1), not the workflow.
- Keep a **pre-migration `pg_dump`** habit for risky schema changes, in addition
  to the daily job.
