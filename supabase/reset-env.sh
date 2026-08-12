#!/usr/bin/env bash
# =====================================================================
# reset-env.sh — reset a NON-PRODUCTION Supabase database to a
# prod-shaped, empty-of-user-data baseline.
#
#   Step 1  wipe   every object in the public schema  (reset-wipe.sql)
#   Step 2  apply  the production schema               (schema-from-prod.sql)
#   Step 3  seed   essential app config                (seed-config.sql)
#
# Usage:
#   supabase/reset-env.sh <target> [--yes]
#
#   <target>   local                 -> local Docker stack (psql)
#              <project-ref>          -> hosted project via Management API
#   --yes      skip the typed confirmation (for scripted/CI use)
#
# Hosted mode reads SUPABASE_PAT from the repo-root .env.
# Local  mode uses $SUPABASE_DB_URL, defaulting to the standard local stack.
#
# SAFETY: refuses to run against the production project ref. The prod ref
# is taken from VITE_SUPABASE_PROJECT_ID in .env (plus a hard-coded
# fallback) so this can never wipe production.
# =====================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

WIPE_SQL="$SCRIPT_DIR/reset-wipe.sql"
SCHEMA_SQL="$SCRIPT_DIR/schema-from-prod.sql"
SEED_SQL="$SCRIPT_DIR/seed-config.sql"

PROD_REF_FALLBACK="igqupnhtbulncgokwbhe"   # hard guard even if .env is missing
LOCAL_DB_URL_DEFAULT="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

die() { echo "ERROR: $*" >&2; exit 1; }

TARGET="${1:-}"
ASSUME_YES="no"
[[ "${2:-}" == "--yes" || "${1:-}" == "--yes" ]] && ASSUME_YES="yes"
[[ "$TARGET" == "--yes" ]] && TARGET=""   # allow flag-first

[[ -n "$TARGET" ]] || die "no target. Usage: supabase/reset-env.sh <local|project-ref> [--yes]"
for f in "$WIPE_SQL" "$SCHEMA_SQL" "$SEED_SQL"; do
  [[ -f "$f" ]] || die "missing SQL file: $f"
done

# --- read prod ref from .env (best-effort) for the guard ------------------
PROD_REF="$PROD_REF_FALLBACK"
if [[ -f "$ENV_FILE" ]]; then
  ENV_PROD_REF="$(grep -E '^VITE_SUPABASE_PROJECT_ID=' "$ENV_FILE" | head -1 | cut -d'"' -f2 || true)"
  [[ -n "${ENV_PROD_REF:-}" ]] && PROD_REF="$ENV_PROD_REF"
fi

# --- prod guard -----------------------------------------------------------
if [[ "$TARGET" == "$PROD_REF" || "$TARGET" == "$PROD_REF_FALLBACK" ]]; then
  die "target '$TARGET' is the PRODUCTION project. Refusing to reset production."
fi

# --- build the combined reset SQL (atomic: wipe + schema + seed) ----------
COMBINED="$(mktemp)"
trap 'rm -f "$COMBINED" "${COMBINED}.json" 2>/dev/null || true' EXIT
{
  echo "-- reset-env.sh combined reset for target: $TARGET"
  echo "-- 1) WIPE"; cat "$WIPE_SQL"; echo
  echo "-- 2) SCHEMA"; cat "$SCHEMA_SQL"; echo
  echo "-- 3) SEED"; cat "$SEED_SQL"; echo
} > "$COMBINED"

echo "About to RESET target: $TARGET"
echo "  wipe   : $(basename "$WIPE_SQL")"
echo "  schema : $(basename "$SCHEMA_SQL")"
echo "  seed   : $(basename "$SEED_SQL")"
echo "This DROPS everything in the public schema and rebuilds it. User data is lost."

if [[ "$ASSUME_YES" != "yes" ]]; then
  read -r -p "Type the target ('$TARGET') to confirm: " ANSWER
  [[ "$ANSWER" == "$TARGET" ]] || die "confirmation did not match; aborted."
fi

# =====================================================================
# LOCAL (Docker) mode — psql against the local stack
# =====================================================================
if [[ "$TARGET" == "local" ]]; then
  command -v psql >/dev/null 2>&1 || die "psql not found (needed for local mode)."
  DB_URL="${SUPABASE_DB_URL:-$LOCAL_DB_URL_DEFAULT}"
  echo "Applying to local DB: $DB_URL"
  psql "$DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$COMBINED"
  echo "--- verification ---"
  psql "$DB_URL" -At -c "
    SELECT 'tables=' || count(*) FROM pg_tables WHERE schemaname='public';" \
    -c "SELECT 'funcs=' || count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';" \
    -c "SELECT 'policies=' || count(*) FROM pg_policies WHERE schemaname='public';"
  echo "Local reset complete."
  exit 0
fi

# =====================================================================
# HOSTED mode — Supabase Management API
# =====================================================================
[[ -f "$ENV_FILE" ]] || die ".env not found at $ENV_FILE (needed for SUPABASE_PAT)."
PAT="$(grep -E '^SUPABASE_PAT=' "$ENV_FILE" | head -1 | cut -d'"' -f2 || true)"
[[ -n "${PAT:-}" ]] || die "SUPABASE_PAT not found in .env."
command -v curl >/dev/null 2>&1 || die "curl not found."
command -v node >/dev/null 2>&1 || die "node not found (used to build the JSON body)."

API="https://api.supabase.com/v1/projects/$TARGET/database/query"

run_sql_file() {  # $1 = path to a .sql file -> prints raw JSON response
  local sqlfile="$1" body="${COMBINED}.json"
  node -e "const fs=require('fs');process.stdout.write(JSON.stringify({query:fs.readFileSync(process.argv[1],'utf8')}))" "$sqlfile" > "$body"
  curl -sS -X POST "$API" \
    -H "Authorization: Bearer $PAT" \
    -H "Content-Type: application/json" \
    --data-binary @"$body"
}

echo "Applying to hosted project: $TARGET"
RESP="$(run_sql_file "$COMBINED")"
# The Management API returns [] on success (trailing GRANTs yield no rows) or
# a JSON object with a "message" field on error.
if echo "$RESP" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);if(!Array.isArray(j)&&j&&j.message){console.error(j.message);process.exit(1)}}catch(e){console.error('unexpected response: '+s.slice(0,300));process.exit(1)}})"; then
  :
else
  die "reset failed (see message above). Nothing was committed (the API runs it transactionally)."
fi

echo "--- verification ---"
VERIFY_SQL="$(mktemp)"; trap 'rm -f "$COMBINED" "${COMBINED}.json" "$VERIFY_SQL" 2>/dev/null || true' EXIT
cat > "$VERIFY_SQL" <<'SQL'
SELECT json_build_object(
  'tables',   (SELECT count(*) FROM pg_tables   WHERE schemaname='public'),
  'funcs',    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
  'policies', (SELECT count(*) FROM pg_policies WHERE schemaname='public'),
  'fks',      (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='f'),
  'config_rows', (SELECT (SELECT count(*) FROM public.api_pricing)
                        + (SELECT count(*) FROM public.app_config)
                        + (SELECT count(*) FROM public.alert_thresholds))
) AS summary;
SQL
run_sql_file "$VERIFY_SQL"
echo
echo "Hosted reset complete for $TARGET."
