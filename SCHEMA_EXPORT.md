# How to Export Schema

## TypeScript Types Export

There are three ways to export TypeScript types from your database:

## Option 1: Using the Generation Script (Recommended)

1. Get a Supabase access token:
   - Go to https://supabase.com/dashboard/account/tokens
   - Create a new access token
   - Copy the token

2. Install tsx if you don't have it:
   ```bash
   npm install -g tsx
   ```

3. Run the generation script:
   ```bash
   SUPABASE_ACCESS_TOKEN=your_token_here npm run generate-types
   ```

This will update `supabase/types.ts` with the latest schema from your database.

## Option 2: Using Supabase API Directly

You can fetch the types manually using curl:

```bash
curl "https://api.supabase.com/v1/projects/ysmtibxbioftvczntckr/types/typescript" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  > supabase/types.ts
```

## Option 3: Using Supabase Dashboard

1. Go to your project dashboard: https://supabase.com/dashboard/project/ysmtibxbioftvczntckr
2. Navigate to the "SQL Editor" section
3. Click on "API Docs" in the sidebar
4. The TypeScript types are displayed in the documentation
5. Copy and paste into `supabase/types.ts`

## When to Regenerate Types

You should regenerate your types whenever you:
- Create new tables
- Add or remove columns
- Modify column types
- Create or update database functions
- Change RLS policies (if they affect the types)

## Current Schema

Your database includes these tables:
- `profiles` - User profiles
- `vocabulary_words` - User vocabulary entries
- `word_statistics` - Learning progress tracking
- `user_tests` - Test sessions
- `test_responses` - Individual test answers
- `word_definitions` - Cached word definitions
- `sefaria_cache` - Cached Sefaria API responses
- `translation_cache` - Cached translations
- `url_extraction_cache` - Cached URL extractions
- `gemini_api_rate_limits` - API rate limiting
- `user_word_definitions` - User-specific word overrides
- `bookmarks` - Saved Hebrew text bookmarks
- `bookmark_folders` - Bookmark organization

And these views:
- `vocabulary_with_stats` - Combined vocabulary and statistics view

And these functions:
- `select_test_words` - Adaptive word selection for tests
- `save_complete_test_results` - Atomic test result saving
- `increment_translation_access` - Update translation cache stats
- `cleanup_*` - Cache cleanup functions

---

## SQL Schema Export

To export the raw SQL schema (all tables, functions, policies):

### Option 1: Using pg_dump

```bash
SUPABASE_DB_URL='your_connection_string' ./scripts/export-sql-schema.sh schema-export.sql
```

Get your connection string from:
https://supabase.com/dashboard/project/ysmtibxbioftvczntckr/settings/database

### Option 2: Using Supabase Dashboard

1. Go to SQL Editor: https://supabase.com/dashboard/project/ysmtibxbioftvczntckr/sql
2. Run this query to see table definitions:
   ```sql
   SELECT
     'CREATE TABLE ' || tablename || ' (...);' as definition
   FROM pg_tables
   WHERE schemaname = 'public';
   ```
3. For full schema, use the Supabase Studio schema viewer

### Option 3: Export All Migrations

All your migrations are already in the `supabase/migrations/` directory. These files represent the complete schema history and can be used to recreate the database.
