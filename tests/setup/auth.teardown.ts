import { test as teardown } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import {
  AUTH_FILE,
  FIXTURE_FILE,
  resolveBackend,
  resolveServiceRoleKey,
  type FixtureRecord,
} from './fixtureBackend';

// Teardown for the real-backend e2e suite — the `cleanup` project, paired to
// `setup` via `teardown: 'cleanup'` in playwright.config.ts. Playwright runs it
// AFTER the `e2e` project finishes (pass OR fail), so the fixture user auth.setup
// created never outlives the run. This matters because the e2e suite targets a
// SHARED real backend (the hosted TEST project in CI, and locally too when you
// point .env.local at it via `npm run sandbox:test-env`): without this, every run
// — local and CI — would leak a fixture user and its data forever.
//
// Deleting the auth user is enough: every table the fixture touches
// (vocabulary_words, user_tests, test_responses, word_statistics, ...) is
// ON DELETE CASCADE on user_id -> auth.users, so one admin delete removes the
// user AND everything it created. Gemini is stubbed in e2e, so nothing reaches
// the global translation_cache / api_usage_logs.

teardown('delete the fixture user and all its data', async () => {
  let record: FixtureRecord;
  try {
    record = JSON.parse(fs.readFileSync(FIXTURE_FILE, 'utf8')) as FixtureRecord;
  } catch {
    // No fixture record: setup never finished creating a user (it writes this
    // file last), so there is nothing to clean up.
    return;
  }

  const { url } = resolveBackend();
  const serviceRoleKey = resolveServiceRoleKey();

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await admin.auth.admin.deleteUser(record.userId);
  if (error) {
    throw new Error(
      `e2e teardown failed to delete fixture user ${record.userId} (${record.email}): ${error.message}`,
    );
  }

  // Drop the local artifacts so a stale id/session can't be reused by a later
  // run that somehow skips setup. (setup regenerates both, since e2e depends on
  // it.)
  for (const file of [FIXTURE_FILE, AUTH_FILE]) {
    try {
      fs.rmSync(file);
    } catch {
      /* already gone */
    }
  }
});
