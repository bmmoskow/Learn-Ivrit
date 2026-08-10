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

## Restore (outline)
1. Download the desired `.sql.gz` from R2.
2. Restore into a target project via the Session-pooler URL:

       gunzip -c backup.sql.gz | psql "postgresql://postgres.<ref>:<pw>@...pooler.supabase.com:5432/postgres"

3. If restoring to a fresh project, apply the schema baseline first (or the dump
   recreates the `public` tables), then verify RLS policies and row counts.

## Notes
- `SUPABASE_DB_URL` grants full read access to the database — treat it as
  sensitive; rotate the DB password if it's ever exposed.
- Retention is handled by the R2 lifecycle rule (step 1), not the workflow.
- Keep a **pre-migration `pg_dump`** habit for risky schema changes, in addition
  to the daily job.
