#!/bin/bash

# Export SQL schema from Supabase database
# This creates a single SQL file with all your table definitions, functions, and policies

OUTPUT_FILE="${1:-schema-export.sql}"
DB_URL="${SUPABASE_DB_URL}"

if [ -z "$DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL environment variable is required"
  echo ""
  echo "To export SQL schema:"
  echo "1. Get your database URL from Supabase dashboard"
  echo "2. Run: SUPABASE_DB_URL='postgresql://...' ./scripts/export-sql-schema.sh"
  exit 1
fi

echo "Exporting schema to $OUTPUT_FILE..."

# Export schema (tables, views, functions, policies)
PGPASSWORD="" pg_dump "$DB_URL" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  > "$OUTPUT_FILE"

if [ $? -eq 0 ]; then
  echo "✓ Schema exported successfully to: $OUTPUT_FILE"
  echo ""
  echo "This file includes:"
  echo "  - All table definitions"
  echo "  - All views"
  echo "  - All functions"
  echo "  - All RLS policies"
  echo "  - All indexes"
else
  echo "✗ Export failed"
  exit 1
fi
